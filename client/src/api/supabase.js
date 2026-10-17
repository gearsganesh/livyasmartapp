import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'your-supabase-publishable-or-anon-key'
);

if (!isSupabaseConfigured) {
  console.error('LIVYA Supabase configuration is incomplete. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the frontend environment.');
}

export const supabase = createClient(
  supabaseUrl || 'https://wbwbvyhvxynfcvisgiun.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'missing-public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'livya-auth-session',
    },
  }
);
