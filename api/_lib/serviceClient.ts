import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con service role para mutar `scheduled_posts` desde los
// endpoints de acción (ya pasaron por requireAdmin). Lanza Error con .status 500
// si faltan credenciales, para que el caller responda 500.
export function serviceClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw Object.assign(new Error('Supabase credentials not configured on server'), { status: 500 });
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
