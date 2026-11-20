// =========================================================================
// CreAPP — Cron de publicación programada a Meta (Instagram/Facebook)
// Fase 1: containerizar filas `queued` con scheduled_at dentro de ~20h.
// Fase 2: confirmar que el container de Meta terminó de procesar.
// Fase 3: publicar las filas listas cuyo horario ya llegó.
// Ver docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import { getContainerStatus, publishContainer } from '../../src/lib/metaCronService.ts';
import {
  selectRowsToContainerize,
  containerizeRow,
  resolveClientToken,
  classifyContainerStatus,
  selectRowsReadyToPublish,
  shouldPublish,
} from '../../src/lib/publishQueuePhases.ts';

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

  // --- Fase 2: confirmar que el container ya terminó de procesar ---
  const { data: containerizingRows, error: containerizingQueryError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'containerizing');

  if (!containerizingQueryError) {
    for (const row of containerizingRows || []) {
      try {
        const accessToken = resolveClientToken(row.client_id, process.env);
        const statusCode = await getContainerStatus({ containerId: row.container_id, accessToken });
        const classification = classifyContainerStatus(statusCode);

        if (classification === 'ready') {
          const updateError = await updateRow(row.id, { status: 'ready' });
          results.push({ id: row.id, status: 'ready', update_error: updateError?.message ?? null });
        } else if (classification === 'error') {
          const updateError = await updateRow(row.id, { status: 'error', error_message: `Meta status_code: ${statusCode}` });
          results.push({ id: row.id, status: 'error', error: statusCode, update_error: updateError?.message ?? null });
        }
        // 'still_waiting': no se toca la fila, se reintenta en el próximo tick.
      } catch (err) {
        const updateError = await updateRow(row.id, { status: 'error', error_message: err.message });
        results.push({ id: row.id, status: 'error', error: err.message, update_error: updateError?.message ?? null });
      }
    }
  } else {
    console.error('[publish-queue] fallo consultando filas containerizing:', containerizingQueryError.message);
  }

  // --- Fase 3: publicar las filas listas cuyo horario ya llegó ---
  const nowPublish = new Date();
  const { data: readyRows, error: readyQueryError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'ready');

  if (!readyQueryError) {
    const rowsDue = selectRowsReadyToPublish(readyRows || [], nowPublish);

    for (const row of rowsDue) {
      try {
        // Releer la fila por id antes de publicar: si otro tick solapado ya
        // la dejó en 'publishing'/'published', shouldPublish corta acá y no
        // se publica dos veces.
        const { data: freshRow, error: freshError } = await supabase
          .from('scheduled_posts')
          .select('*')
          .eq('id', row.id)
          .single();

        if (freshError || !freshRow || !shouldPublish(freshRow)) {
          continue;
        }

        // Este write es el que protege contra el doble-publish: si Supabase
        // lo rechaza, la fila sigue en 'ready' y un tick solapado podría
        // publicarla de nuevo. No seguir de largo si falla.
        const publishingUpdateError = await updateRow(row.id, { status: 'publishing' });
        if (publishingUpdateError) {
          results.push({ id: row.id, status: 'error', error: 'No se pudo marcar publishing', update_error: publishingUpdateError.message });
          continue;
        }

        const accessToken = resolveClientToken(row.client_id, process.env);
        const mediaId = await publishContainer({
          igAccountId: row.ig_account_id,
          accessToken,
          containerId: row.container_id,
        });
        const updateError = await updateRow(row.id, { status: 'published', published_media_id: mediaId });
        results.push({ id: row.id, status: 'published', published_media_id: mediaId, update_error: updateError?.message ?? null });
      } catch (err) {
        const updateError = await updateRow(row.id, { status: 'error', error_message: err.message });
        results.push({ id: row.id, status: 'error', error: err.message, update_error: updateError?.message ?? null });
      }
    }
  } else {
    console.error('[publish-queue] fallo consultando filas ready:', readyQueryError.message);
  }

  return res.status(200).json({ processed: results.length, results });
}
