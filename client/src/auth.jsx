import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './api/supabase.js';

const AuthContext = createContext(null);
const SESSION_STARTED_KEY = 'livya-session-started-at';
const SESSION_MAX_AGE_MS = 3 * 60 * 60 * 1000;

async function loadProfile(authUser) {
  if (!authUser) return null;
  const { data, error } = await supabase
    .from('User')
    .select('id,email,fullName,role,isActive,createdAt,updatedAt')
    .eq('id', authUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.isActive) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('This account is not enabled for LIVYA. Contact your administrator.');
  }
  return {
    id: data.id,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    isActive: data.isActive,
    createdAt: data.createdAt,
  };
}

function sessionExpired() {
  const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY));
  return startedAt > 0 && Date.now() - startedAt >= SESSION_MAX_AGE_MS;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        setUser(null);
        return null;
      }
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (authUser && sessionExpired()) {
        await supabase.auth.signOut({ scope: 'local' });
        localStorage.removeItem(SESSION_STARTED_KEY);
        setUser(null);
        return null;
      }
      if (authUser && !localStorage.getItem(SESSION_STARTED_KEY)) {
        localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
      }
      const profile = await loadProfile(authUser);
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') localStorage.removeItem(SESSION_STARTED_KEY);
      if (event === 'SIGNED_IN' && session && !localStorage.getItem(SESSION_STARTED_KEY)) {
        localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
      }
      // Run profile queries after the auth callback releases Supabase's internal lock.
      Promise.resolve().then(async () => {
        if (!mounted) return;
        try {
          if (session && sessionExpired()) {
            await supabase.auth.signOut({ scope: 'local' });
            if (mounted) setUser(null);
            return;
          }
          const profile = await loadProfile(session?.user || null);
          if (mounted) setUser(profile);
        } catch {
          if (mounted) setUser(null);
        } finally {
          if (mounted) setLoading(false);
        }
      });
    });
    refresh();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY)) || Date.now();
    const remaining = Math.max(0, SESSION_MAX_AGE_MS - (Date.now() - startedAt));
    const timer = window.setTimeout(async () => {
      await supabase.auth.signOut({ scope: 'local' });
      localStorage.removeItem(SESSION_STARTED_KEY);
      setUser(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [user]);

  const login = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('LIVYA sign-in is not configured yet. Add the Supabase URL and publishable key to the Vercel frontend environment.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message);
    localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
  };

  const register = async () => {
    throw new Error('Registration is restricted. Contact your administrator.');
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    localStorage.removeItem(SESSION_STARTED_KEY);
    setUser(null);
    if (error) throw error;
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be inside AuthProvider');
  return value;
}
