// POST /api/launches/reschedule — actualiza scheduled_at. Si la fila venía de
// `ready`, la resetea a `queued` y limpia container_id (re-containerizar: un
// container de Meta expira ~24h y publicar con uno viejo fallaría).
// Válido desde queued/ready. Admin-only, service role.
import { requireAdmin } from '../_lib/requireAdmin.js';
import { applyPortalCors } from '../_lib/portalCors.js';
import { serviceClient } from '../_lib/serviceClient.js';
import { actionError } from '../../src/lib/launchesActions.js';

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

  const body = req.body || {};
  const id = body.id;
  const scheduledAt = body.scheduled_at;
  if (!id) return res.status(400).json({ error: 'Falta id' });
  if (!scheduledAt) return res.status(400).json({ error: 'Falta scheduled_at' });
  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) {
    return res.status(400).json({ error: 'scheduled_at no es una fecha válida' });
  }

  const { data: row, error: readErr } = await sb
    .from('scheduled_posts')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return res.status(500).json({ error: readErr.message });
  if (!row) return res.status(404).json({ error: 'No se encontró la publicación' });

  const guard = actionError('reschedule', row.status);
  if (guard) return res.status(409).json({ error: guard });

  const patch =
    row.status === 'ready'
      ? { scheduled_at: parsed.toISOString(), status: 'queued', container_id: null }
      : { scheduled_at: parsed.toISOString() };

  const { data: updated, error: upErr } = await sb
    .from('scheduled_posts')
    .update(patch)
    .eq('id', id)
    .eq('status', row.status)
    .select('id');
  if (upErr) return res.status(500).json({ error: upErr.message });
  if (!updated || updated.length !== 1) {
    return res.status(409).json({ error: 'El estado cambió mientras tanto; recargá e intentá de nuevo.' });
  }

  return res.status(200).json({ ok: true, id, scheduled_at: parsed.toISOString(), status: patch.status ?? row.status });
}
