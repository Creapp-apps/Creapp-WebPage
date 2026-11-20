// =========================================================================
// CreAPP — Cron de publicación programada a Meta (Instagram/Facebook)
// Fase 1: containerizar filas `queued` con scheduled_at dentro de ~20h.
// Ver docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import { selectRowsToContainerize, containerizeRow, resolveClientToken } from '../../src/lib/publishQueuePhases.ts';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured on server' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 20 * 60 * 60 * 1000);

  const { data: candidateRows, error: queryError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', windowEnd.toISOString());

  if (queryError) {
    return res.status(500).json({ error: 'Failed to query scheduled_posts', details: queryError.message });
  }

  const rows = selectRowsToContainerize(candidateRows || [], now);
  const results = [];

  for (const row of rows) {
    try {
      const accessToken = resolveClientToken(row.client_id, process.env);
      const outcome = await containerizeRow(row, accessToken);

      if (outcome.error) {
        await supabase
          .from('scheduled_posts')
          .update({ status: 'error', error_message: outcome.error })
          .eq('id', row.id);
        results.push({ id: row.id, status: 'error', error: outcome.error });
        continue;
      }

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'containerizing',
          container_id: outcome.containerId,
          child_container_ids: outcome.childContainerIds ?? null,
        })
        .eq('id', row.id);
      results.push({ id: row.id, status: 'containerizing', container_id: outcome.containerId });
    } catch (err) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'error', error_message: err.message })
        .eq('id', row.id);
      results.push({ id: row.id, status: 'error', error: err.message });
    }
  }

  return res.status(200).json({ processed: results.length, results });
}
