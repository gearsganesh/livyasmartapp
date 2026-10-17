import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('LIVYA requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the production environment.');
}

export const supabase = createClient(
  supabaseUrl || 'https://wbwbvyhvxynfcvisgiun.supabase.co',
  supabaseAnonKey || 'missing-public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'livya-auth-session',
    },
  }
);
