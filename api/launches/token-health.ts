// GET /api/launches/token-health?client=<slug> — lo llama el MOTOR server-to-server
// (pre-flight de campaña). Auth: secreto compartido PORTAL_INTERNAL_SECRET.
import { resolveClientToken } from '../../src/lib/publishQueuePhases.js';
import { parseDebugToken } from '../../src/lib/tokenHealth.js';
import { applyPortalCors } from '../_lib/portalCors.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  if (applyPortalCors(req, res)) return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.PORTAL_INTERNAL_SECRET;
  if (!secret || req.headers?.authorization !== `Bearer ${secret}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const client = String(req.query?.client || '');
  if (!/^[\w-]+$/.test(client)) return res.status(400).json({ error: 'Falta o es inválido client' });

  let tok: string;
  try {
    tok = resolveClientToken(client, process.env);
  } catch {
    return res.status(200).json({ is_valid: false, expires_at: null, error: 'token no configurado' });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(
      `${GRAPH_API_BASE}/debug_token?input_token=${encodeURIComponent(tok)}&access_token=${encodeURIComponent(tok)}`,
      { signal: ctrl.signal },
    );
    return res.status(200).json(parseDebugToken(await r.json()));
  } catch (e) {
    return res.status(502).json({
      is_valid: false,
      expires_at: null,
      error: e?.name === 'AbortError' ? 'Timeout consultando Graph' : 'Error consultando Graph',
    });
  } finally {
    clearTimeout(timer);
  }
}
