// =========================================================================
// CreAPP — Lógica de las 3 fases de la cola de publicación programada.
// Extraída de api/cron/publish-queue.ts para poder correrla:
//   - completa (cron tick / run-tick global), SIN onlyId;
//   - acotada a una sola fila (force-run), CON onlyId.
//
// IMPORTANTE: el heartbeat (`cron_runs`) NO vive acá — envuelve sólo el
// handler del cron. force-run/run-tick llaman a esta función sin escribir
// heartbeat. Ver docs/.../2026-11-20-publicacion-programada-sin-pc-design.md
// =========================================================================

import { getContainerStatus, publishContainer, getMediaPermalink } from './metaCronService.js';
import {
  selectRowsToContainerize,
  containerizeRow,
  resolveClientToken,
  classifyContainerStatus,
  selectRowsReadyToPublish,
} from './publishQueuePhases.js';

export interface RunPublishQueueOptions {
  // Acota TODAS las fases a este `scheduled_posts.id` (force-run de una pieza).
  // Sin él, se procesa la cola entera (cron tick / run-tick), igual que hoy.
  onlyId?: string;
  // Reloj inyectable (tests / determinismo). Sin él, cada fase usa `new Date()`
  // igual que el handler original (fase 1 y fase 3 tomaban Dates separadas).
  now?: Date;
}

export interface RunPublishQueueResult {
  results: Array<Record<string, unknown>>;
  // Sólo se setea si la query de la Fase 1 falla (fatal → el caller responde 500).
  phase1Error?: string;
}

export async function runPublishQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  opts: RunPublishQueueOptions = {},
): Promise<RunPublishQueueResult> {
  const onlyId = opts.onlyId;

  // Toda escritura a `scheduled_posts` pasa por acá: si Supabase rechaza el
  // update (RLS, red, lo que sea), la fila puede quedar en un estado que no
  // refleja lo que pasó realmente (ej. el container de Meta ya existe, pero
  // la fila sigue en `queued` y el próximo tick la vuelve a containerizar,
  // duplicando el container). Nunca tragarse ese error en silencio.
  async function updateRow(id, patch) {
    const { error } = await sb.from('scheduled_posts').update(patch).eq('id', id);
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
    const { data, error } = await sb
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

  const results: Array<Record<string, unknown>> = [];

  // --- Fase 1: containerizar filas `queued` cuyo horario entra en la ventana ---
  const now = opts.now ?? new Date();
  const windowEnd = new Date(now.getTime() + 20 * 60 * 60 * 1000);

  let candidateQuery = sb
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', windowEnd.toISOString());
  if (onlyId) candidateQuery = candidateQuery.eq('id', onlyId);
  const { data: candidateRows, error: queryError } = await candidateQuery;

  if (queryError) {
    // Fatal: el caller (handler del cron) responde 500 y finaliza el heartbeat
    // con outcome error. force-run/run-tick también propagan 500.
    return { results, phase1Error: queryError.message };
  }

  const rows = selectRowsToContainerize(candidateRows || [], now);

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
  let containerizingQuery = sb.from('scheduled_posts').select('*').eq('status', 'containerizing');
  if (onlyId) containerizingQuery = containerizingQuery.eq('id', onlyId);
  const { data: containerizingRows, error: containerizingQueryError } = await containerizingQuery;

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
  const nowPublish = opts.now ?? new Date();
  let readyQuery = sb.from('scheduled_posts').select('*').eq('status', 'ready');
  if (onlyId) readyQuery = readyQuery.eq('id', onlyId);
  const { data: readyRows, error: readyQueryError } = await readyQuery;

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
              const { error: permWriteErr } = await sb.from('scheduled_posts').update({ permalink }).eq('id', row.id);
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

  return { results };
}
