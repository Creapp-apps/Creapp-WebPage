// POST /api/launches/retry — resetea una fila a `queued`, limpia error_message
// y container_id. Válido desde `error` o desde `queued`/`containerizing` trabada
// (sin cambios por > 20 min). Admin-only, service role.
import { requireAdmin } from '../_lib/requireAdmin.js';
import { applyPortalCors } from '../_lib/portalCors.js';
import { serviceClient } from '../_lib/serviceClient.js';
import { actionError } from '../../src/lib/launchesActions.js';

const STUCK_MS = 20 * 60 * 1000;

export default async function handler(req, res) {
  if (applyPortalCors(req, res)) return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let sb;
  try {
    await requireAdmin(req);
    sb = serviceClient();
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const id = (req.body || {}).id;
  if (!id) return res.status(400).json({ error: 'Falta id' });

  const { data: row, error: readErr } = await sb
    .from('scheduled_posts')
    .select('status, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return res.status(500).json({ error: readErr.message });
  if (!row) return res.status(404).json({ error: 'No se encontró la publicación' });

  // `stuck` se calcula server-side desde updated_at (no se confía en el cliente).
  const updatedMs = row.updated_at ? new Date(row.updated_at).getTime() : NaN;
  const stuck = Number.isFinite(updatedMs) && Date.now() - updatedMs > STUCK_MS;

  // Defensa en profundidad: nunca resetear publishing/ready/published/cancelled.
  if (!['queued', 'containerizing', 'error'].includes(row.status)) {
    return res.status(409).json({ error: actionError('retry', row.status, stuck) || `No se puede reintentar una publicación en estado "${row.status}".` });
  }
  const guard = actionError('retry', row.status, stuck);
  if (guard) return res.status(409).json({ error: guard });

  const { data: updated, error: upErr } = await sb
    .from('scheduled_posts')
    .update({ status: 'queued', error_message: null, container_id: null })
    .eq('id', id)
    .eq('status', row.status)
    .select('id');
  if (upErr) return res.status(500).json({ error: upErr.message });
  if (!updated || updated.length !== 1) {
    return res.status(409).json({ error: 'El estado cambió mientras tanto; recargá e intentá de nuevo.' });
  }

  return res.status(200).json({ ok: true, id, status: 'queued' });
}
