// =========================================================================
// CreAPP — Cron de AVISOS PREVIOS de publicación (Capa 4 de notificaciones).
// Ping por pieza (~LEAD min antes) + digest matinal. Escribe en app_notifications
// (campanita + SO). Gate de CRON_SECRET idéntico a publish-queue. La lógica vive
// en src/lib/runPublishReminders.ts.
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import { runPublishReminders } from '../../src/lib/runPublishReminders.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET not configured on server' });
  }
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured on server' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const result = await runPublishReminders(supabase, new Date(), process.env);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[publish-reminders] excepción:', err?.message);
    return res.status(500).json({ error: 'runPublishReminders lanzó una excepción', details: err?.message });
  }
}
