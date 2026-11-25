import { createClient } from '@supabase/supabase-js';

// Valida el Bearer y exige que el usuario sea miembro de al menos un cliente.
// Éxito: { user, clients: [{ id (uuid), slug }] }. Falla: lanza Error con .status.
// client_members.client_id es uuid (clients.id); se traduce a slug (la llave que
// usa Insights para token/scheduled_posts/caché). Ver spec §6.2.
export async function requireMember(req) {
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

  const { data: memberRows, error: mErr } = await supabase
    .from('client_members')
    .select('client_id')
    .eq('user_id', user.id);
  if (mErr) throw fail(403);
  const ids = (memberRows ?? []).map((r) => r.client_id).filter(Boolean);
  if (ids.length === 0) throw fail(403);

  const { data: clientRows, error: cErr } = await supabase
    .from('clients')
    .select('id, slug')
    .in('id', ids);
  if (cErr) throw fail(403);
  const clients = (clientRows ?? []).filter((c) => c.slug);
  if (clients.length === 0) throw fail(403);

  return { user, clients };
}
