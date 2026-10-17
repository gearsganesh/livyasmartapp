import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './api/supabase.js';

const AuthContext = createContext(null);

async function loadProfile(authUser) {
  if (!authUser) return null;
  const { data, error } = await supabase
    .from('User')
    .select('id,email,fullName,role,isActive,createdAt,updatedAt')
    .eq('id', authUser.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.isActive) {
    await supabase.auth.signOut();
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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer the profile query so it doesn't run inside the auth callback lock.
      Promise.resolve().then(async () => {
        if (!mounted) return;
        try {
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

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Invalid email or password.' : error.message);
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
  };

  const register = async (email, password, fullName) => {
    if (import.meta.env.VITE_ALLOW_PUBLIC_REGISTRATION !== 'true') {
      throw new Error('Registration is restricted. Contact your administrator.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim(), requested_role: 'CLIENT' } },
    });
    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error('Check your email to confirm your account before signing in.');
    }
    // A public signup must not grant a role by user-supplied metadata. The matching
    // public.User profile is provisioned by the trusted admin workflow, not the browser.
    await supabase.auth.signOut();
    throw new Error('Public registration is not enabled for this deployment. Contact your administrator.');
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
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
