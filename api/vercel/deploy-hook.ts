// POST /api/vercel/deploy-hook — Webhook de deploy de Vercel. Firma HMAC = auth,
// verificada sobre el body crudo antes de cualquier escritura.
import { verifyVercelSignature, parseDeployEvent } from '../../src/lib/vercelWebhook.js';
import { readRawBody } from '../_lib/rawBody.js';
import { serviceClient } from '../_lib/serviceClient.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'VERCEL_WEBHOOK_SECRET no configurado' });

  const raw = await readRawBody(req);
  const sig = String(req.headers?.['x-vercel-signature'] || '');
  if (!verifyVercelSignature(raw, sig, secret)) return res.status(403).json({ error: 'Firma inválida' });

  let json;
  try { json = JSON.parse(raw); } catch { return res.status(400).json({ error: 'JSON inválido' }); }

  const row = parseDeployEvent(json);
  if (!row) return res.status(200).json({ ok: true, ignored: true });

  try {
    const { error } = await serviceClient().from('deploy_events').insert(row);
    if (error) return res.status(500).json({ error: error.message });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }
  return res.status(200).json({ ok: true });
}
