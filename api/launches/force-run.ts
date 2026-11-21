// POST /api/launches/force-run — avanza UNA pieza (id en el body) lo máximo
// posible en la llamada: si queued la containeriza; si containerizing consulta
// Meta; si ready y la hora llegó, publica. Es el bisturí ("puede publicar").
// Admin-only, service role. NO escribe heartbeat `cron_runs` (eso es del cron).
import { requireAdmin } from '../_lib/requireAdmin.js';
import { applyPortalCors } from '../_lib/portalCors.js';
import { serviceClient } from '../_lib/serviceClient.js';
import { actionError } from '../../src/lib/launchesActions.js';
import { runPublishQueue } from '../../src/lib/runPublishQueue.js';

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
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return res.status(500).json({ error: readErr.message });
  if (!row) return res.status(404).json({ error: 'No se encontró la publicación' });

  const guard = actionError('force', row.status);
  if (guard) return res.status(409).json({ error: guard });

  // Acotado a esta fila: cada fase filtra por `id`. Sin heartbeat.
  const { results, phase1Error } = await runPublishQueue(sb, { onlyId: id });
  if (phase1Error) {
    return res.status(500).json({ error: 'Failed to query scheduled_posts', details: phase1Error });
  }

  return res.status(200).json({ ok: true, id, processed: results.length, results });
}
