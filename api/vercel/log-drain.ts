// POST /api/vercel/log-drain — Log Drain de Vercel. La firma HMAC es la auth:
// se verifica sobre el body crudo ANTES de tocar la DB. Inserta con service role.
import { verifyVercelSignature, parseDrainLine } from '../../src/lib/vercelWebhook.js';
import { splitDrainEntries } from '../../src/lib/drainBody.js';
import { readRawBody } from '../_lib/rawBody.js';
import { serviceClient } from '../_lib/serviceClient.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.VERCEL_LOG_DRAIN_SECRET;
  if (!secret) return res.status(500).json({ error: 'VERCEL_LOG_DRAIN_SECRET no configurado' });

  const raw = await readRawBody(req);
  const sig = String(req.headers?.['x-vercel-signature'] || '');
  if (!verifyVercelSignature(raw, sig, secret)) return res.status(403).json({ error: 'Firma inválida' });

  const rows = splitDrainEntries(raw).map(parseDrainLine).filter((r) => r !== null);
  if (rows.length === 0) return res.status(200).json({ ok: true, inserted: 0 });

  try {
    const { error } = await serviceClient().from('cron_log_events').insert(rows);
    if (error) return res.status(500).json({ error: error.message });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
  return res.status(200).json({ ok: true, inserted: rows.length });
}
