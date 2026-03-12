import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables are not configured. Admin features will not work.');
      // Return a dummy client that won't crash - operations will fail gracefully
      _supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
    } else {
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return _supabase;
}

// Backward-compatible export for existing imports
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
