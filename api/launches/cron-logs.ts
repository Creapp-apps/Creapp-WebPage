// GET /api/launches/cron-logs?deploymentId=... — forense: proxy a los runtime logs
// de Vercel. Admin-only.
import { requireAdmin } from '../_lib/requireAdmin.js';
import { applyPortalCors } from '../_lib/portalCors.js';

export default async function handler(req, res) {
  if (applyPortalCors(req, res)) return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireAdmin(req);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const deploymentId = String(req.query?.deploymentId || '');
  if (!/^[\w-]+$/.test(deploymentId)) return res.status(400).json({ error: 'Falta o es inválido deploymentId' });

  const { VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID } = process.env;
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return res.status(500).json({ error: 'VERCEL_TOKEN / VERCEL_PROJECT_ID no configurados' });
  }

  const qs = VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : '';
  const url = `https://api.vercel.com/v1/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/deployments/${encodeURIComponent(deploymentId)}/runtime-logs${qs}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, signal: ctrl.signal });
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: `Vercel respondió ${r.status}`, detail: text.slice(0, 500) });
    return res.status(200).json({ ok: true, deploymentId, logs: text });
  } catch (e) {
    return res.status(502).json({ error: e.name === 'AbortError' ? 'Timeout leyendo logs de Vercel' : e.message });
  } finally {
    clearTimeout(timer);
  }
}
