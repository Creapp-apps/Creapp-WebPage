// POST /api/launches/run-tick — "correr el tick ahora" (global, recuperación).
// Ejecuta la cola completa una vez (mismo filtro ready/due que el cron): adelanta
// el tick automático tras una caída. NO autoriza publicaciones nuevas — cada
// pieza ya tuvo su OK al programarse. Admin-only, service role.
// NO escribe heartbeat `cron_runs` (eso es exclusivo del handler del cron).
import { requireAdmin } from '../_lib/requireAdmin.js';
import { applyPortalCors } from '../_lib/portalCors.js';
import { serviceClient } from '../_lib/serviceClient.js';
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

  // Cola completa, sin filtro de id (idéntico al cron, sin heartbeat).
  const { results, phase1Error } = await runPublishQueue(sb, {});
  if (phase1Error) {
    return res.status(500).json({ error: 'Failed to query scheduled_posts', details: phase1Error });
  }

  return res.status(200).json({ ok: true, processed: results.length, results });
}
