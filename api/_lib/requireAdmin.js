import { createClient } from '@supabase/supabase-js';
import { resolveIsAdmin } from '../../src/lib/adminRole.js';

// Valida el Bearer token y exige admin. Éxito: { user }. Falla: lanza Error con .status (401/403).
export async function requireAdmin(req) {
  const fail = (status) => Object.assign(new Error(status === 401 ? 'Unauthorized' : 'Forbidden'), { status });

  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) throw fail(401);

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw fail(401);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await supabase.auth.getUser(m[1]);
  if (error || !data?.user) throw fail(401);
  const user = data.user;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!resolveIsAdmin({ email: user.email, profileRole: profile?.role ?? null })) throw fail(403);
  return { user };
}
