// =========================================================================
// CreAPP — Cron de publicación programada a Meta (Instagram/Facebook)
// Fase 1: containerizar filas `queued` con scheduled_at dentro de ~20h.
// Fase 2: confirmar que el container de Meta terminó de procesar.
// Fase 3: publicar las filas listas cuyo horario ya llegó.
// Ver docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import { getContainerStatus, publishContainer, getMediaPermalink } from '../../src/lib/metaCronService.js';
import { buildRunStart, buildRunEnd } from '../../src/lib/cronHeartbeat.js';
import {
  selectRowsToContainerize,
  containerizeRow,
  resolveClientToken,
  classifyContainerStatus,
  selectRowsReadyToPublish,
} from '../../src/lib/publishQueuePhases.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET not configured on server' });
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

  // Heartbeat: fila `started` (no debe romper el cron si falla).
  let runId = null;
  try {
    const { data: runRow, error: runErr } = await supabase
      .from('cron_runs')
      .insert(buildRunStart(process.env))
      .select('id')
      .single();
    if (runErr) console.error('[publish-queue] heartbeat start fallo:', runErr.message);
    else runId = runRow?.id ?? null;
  } catch (err) {
    console.error('[publish-queue] heartbeat start fallo:', err.message);
  }

  // Cierra la fila de heartbeat (nunca rompe el cron si falla).
  async function finishRun(end) {
    if (!runId) return;
    try {
      const { error: endErr } = await supabase
        .from('cron_runs')
        .update({ finished_at: new Date().toISOString(), ...end })
        .eq('id', runId);
      if (endErr) console.error('[publish-queue] heartbeat end fallo:', endErr.message);
    } catch (err) {
      console.error('[publish-queue] heartbeat end fallo:', err.message);
    }
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 20 * 60 * 60 * 1000);

  const { data: candidateRows, error: queryError } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', windowEnd.toISOString());

  if (queryError) {
    await finishRun({ outcome: 'error', processed_count: 0, published_count: 0, error_count: 1, error_text: queryError.message });
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

  // Reclamo atómico: solo escribe si la fila SIGUE en `fromStatus` en este
  // mismo instante (compare-and-swap vía `.eq('status', fromStatus)`).
  // Vercel puede entregar el mismo evento de cron más de una vez, y dos
  // ticks solapados pueden pasar un chequeo de lectura+decisión+escritura no
  // atómico al mismo tiempo — esto es lo que lo vuelve seguro de verdad,
  // no solo "poco probable".
  async function claimRow(id, fromStatus, patch) {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .update(patch)
      .eq('id', id)
      .eq('status', fromStatus)
      .select('id');
    if (error) {
      console.error(`[publish-queue] fallo al reclamar scheduled_posts.id=${id}:`, error.message);
      return { claimed: false, error };
    }
    return { claimed: (data || []).length === 1, error: null };
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

      const { claimed, error: claimError } = await claimRow(row.id, 'queued', {
        status: 'containerizing',
        container_id: outcome.containerId,
        child_container_ids: outcome.childContainerIds ?? null,
      });
      results.push({
        id: row.id,
        status: claimed ? 'containerizing' : 'skipped_race',
        container_id: outcome.containerId,
        update_error: claimError?.message ?? null,
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
      let accessToken;
      try {
        accessToken = resolveClientToken(row.client_id, process.env);
      } catch (err) {
        // Falta de configuración (token no seteado) no es transitorio —
        // no se va a arreglar solo en el próximo tick. Terminal, igual que
        // en las Fases 1 y 3.
        const updateError = await updateRow(row.id, { status: 'error', error_message: err.message });
        results.push({ id: row.id, status: 'error', error: err.message, update_error: updateError?.message ?? null });
        continue;
      }

      try {
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
        // Un fallo ACÁ (red, 5xx de Meta, rate limit) es, la mayoría de las
        // veces, transitorio: el container sigue existiendo en Meta y puede
        // terminar de procesar bien. Pasarla a `error` de forma permanente
        // tiraría a la basura una pieza que iba a publicarse igual. Se deja
        // en `containerizing` para que el próximo tick la vuelva a
        // consultar — solo Meta diciendo ERROR/EXPIRED de verdad
        // (clasificado arriba) es terminal.
        console.error(`[publish-queue] fallo transitorio consultando estado de scheduled_posts.id=${row.id} (se reintenta):`, err.message);
        results.push({ id: row.id, status: 'containerizing', error: err.message, retry: true });
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
        // Reclamo atómico 'ready' -> 'publishing': si otro tick solapado ya
        // reclamó esta fila (o Meta entregó el mismo evento de cron dos
        // veces), ese `.eq('status', 'ready')` deja de matchear y
        // `claimed` da false acá. No hay ventana entre leer y escribir —
        // es la única operación que decide quién publica.
        const { claimed, error: claimError } = await claimRow(row.id, 'ready', { status: 'publishing' });
        if (!claimed) {
          if (claimError) {
            results.push({ id: row.id, status: 'error', error: 'No se pudo reclamar publishing', update_error: claimError.message });
          }
          continue;
        }

        const accessToken = resolveClientToken(row.client_id, process.env);
        const mediaId = await publishContainer({
          igAccountId: row.ig_account_id,
          accessToken,
          containerId: row.container_id,
        });
        // Transición crítica sola: si falla, el permalink no puede bloquearla.
        const updateError = await updateRow(row.id, { status: 'published', published_media_id: mediaId });
        // Permalink best-effort, aparte: nunca afecta el estado published.
        if (!updateError) {
          try {
            const permalink = await getMediaPermalink({ mediaId, accessToken });
            if (permalink) {
              const { error: permWriteErr } = await supabase.from('scheduled_posts').update({ permalink }).eq('id', row.id);
              if (permWriteErr) console.error(`[publish-queue] fallo escribiendo permalink de scheduled_posts.id=${row.id}:`, permWriteErr.message);
            }
          } catch (permErr) {
            console.error(`[publish-queue] no se pudo traer permalink de scheduled_posts.id=${row.id}:`, permErr.message);
          }
        }
        results.push({ id: row.id, status: 'published', published_media_id: mediaId, update_error: updateError?.message ?? null });
      } catch (err) {
        const updateError = await updateRow(row.id, { status: 'error', error_message: err.message });
        results.push({ id: row.id, status: 'error', error: err.message, update_error: updateError?.message ?? null });
      }
    }
  } else {
    console.error('[publish-queue] fallo consultando filas ready:', readyQueryError.message);
    results.push({ id: 'phase3-query', status: 'error', error: readyQueryError.message });
  }

  await finishRun(buildRunEnd(results));

  return res.status(200).json({ processed: results.length, results });
}
