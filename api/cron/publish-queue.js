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

  // Toda escritura a `scheduled_posts` pasa por acá: si Supabase rechaza el
  // update (RLS, red, lo que sea), la fila puede quedar en un estado que no
  // refleja lo que pasó realmente (ej. el container de Meta ya existe, pero
  // la fila sigue en `queued` y el próximo tick la vuelve a containerizar,
  // duplicando el container). Nunca tragarse ese error en silencio.
  async function updateRow(id, patch) {
    const { error } = await supabase.from('scheduled_posts').update(patch).eq('id', id);
    if (error) {
      console.error(`[publish-queue] fallo al actualizar scheduled_posts.id=${id}:`, error.message);
    }
    return error;
  }

  for (const row of rows) {
    try {
      const accessToken = resolveClientToken(row.client_id, process.env);
      const outcome = await containerizeRow(row, accessToken);

      if (outcome.error) {
        const updateError = await updateRow(row.id, { status: 'error', error_message: outcome.error });
        results.push({ id: row.id, status: 'error', error: outcome.error, update_error: updateError?.message ?? null });
        continue;
      }

      const updateError = await updateRow(row.id, {
        status: 'containerizing',
        container_id: outcome.containerId,
        child_container_ids: outcome.childContainerIds ?? null,
      });
      results.push({
        id: row.id,
        status: 'containerizing',
        container_id: outcome.containerId,
        update_error: updateError?.message ?? null,
      });
    } catch (err) {
      const updateError = await updateRow(row.id, { status: 'error', error_message: err.message });
      results.push({ id: row.id, status: 'error', error: err.message, update_error: updateError?.message ?? null });
    }
  }

  return res.status(200).json({ processed: results.length, results });
}
