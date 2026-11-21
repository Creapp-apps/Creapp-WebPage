// =========================================================================
// CreAPP — Cron de publicación programada a Meta (Instagram/Facebook)
// Fase 1: containerizar filas `queued` con scheduled_at dentro de ~20h.
// Fase 2: confirmar que el container de Meta terminó de procesar.
// Fase 3: publicar las filas listas cuyo horario ya llegó.
//
// Las 3 fases viven en src/lib/runPublishQueue.ts (reutilizadas por los
// endpoints force-run/run-tick). El heartbeat (`cron_runs`) y el gate de
// CRON_SECRET se quedan ACÁ, envolviendo sólo este handler.
// Ver docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md
// =========================================================================

import { createClient } from '@supabase/supabase-js';
import { buildRunStart, buildRunEnd } from '../../src/lib/cronHeartbeat.js';
import { runPublishQueue } from '../../src/lib/runPublishQueue.js';

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

  // Cron tick: cola completa, sin filtro de id. finally garantiza cerrar el heartbeat.
  let finished = false;
  try {
    const { results, phase1Error } = await runPublishQueue(supabase, {});

    if (phase1Error) {
      finished = true;
      await finishRun({ outcome: 'error', processed_count: 0, published_count: 0, error_count: 1, error_text: phase1Error });
      return res.status(500).json({ error: 'Failed to query scheduled_posts', details: phase1Error });
    }

    finished = true;
    await finishRun(buildRunEnd(results));
    return res.status(200).json({ processed: results.length, results });
  } finally {
    if (!finished) {
      await finishRun({ outcome: 'error', processed_count: 0, published_count: 0, error_count: 1, error_text: 'runPublishQueue lanzó una excepción' });
    }
  }
}
