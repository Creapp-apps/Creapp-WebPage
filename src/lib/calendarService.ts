// Lectura + realtime de las scheduled_posts del cliente (realm portal).
// RLS ("Members can read own scheduled_posts") scopea las filas al cliente;
// acá se proyectan SOLO columnas seguras (sin error_message/raw). Espejo
// reducido de launchesService. Ver spec §5.2.

import { getSupabase } from './supabaseClient';
import { mapScheduledRows } from './calendarMapper';
import type { CalJobRow, CalendarPiece, SchedRowSafe } from './calendarTypes';

export type { CalendarPiece } from './calendarTypes';

const SAFE_COLS =
  'id, client_id, job_id, status, scheduled_at, cover_r2_url, media_r2_urls, caption, platform, permalink, published_media_id, updated_at';

interface JobRow { id: string; job_id_motor: string; campaign_id: string; type: string | null }
interface AssetRow { job_id: string; kind: string; url: string }

/** Piezas del calendario del cliente, scopeadas a la campaña activa (si se pasa). */
export async function getMyCalendarPieces(campaignId: string | null): Promise<CalendarPiece[]> {
  const sb = getSupabase();

  const sp = await sb.from('scheduled_posts').select(SAFE_COLS).order('scheduled_at', { ascending: true });
  if (sp.error) throw sp.error;
  const rows = (sp.data ?? []) as SchedRowSafe[];
  if (rows.length === 0) return [];

  // scheduled_posts.job_id = content_jobs.job_id_motor; content_assets.job_id = content_jobs.id (uuid).
  const motorIds = [...new Set(rows.map((r) => r.job_id).filter(Boolean))];
  const jr = motorIds.length
    ? await sb.from('content_jobs').select('id, job_id_motor, campaign_id, type').in('job_id_motor', motorIds)
    : { data: [], error: null };
  if (jr.error) throw jr.error;
  const jobs = (jr.data ?? []) as JobRow[];

  const jobUuids = jobs.map((j) => j.id).filter(Boolean);
  const ar = jobUuids.length
    ? await sb.from('content_assets').select('job_id, kind, url').in('kind', ['cover_9_16', 'slide']).in('job_id', jobUuids)
    : { data: [], error: null };
  if (ar.error) throw ar.error;
  const assets = (ar.data ?? []) as AssetRow[];

  // Cover de fallback por job: primer cover_9_16, si no, primer slide.
  const coverByJobUuid = new Map<string, string>();
  for (const a of assets) {
    if (a.kind === 'cover_9_16' && !coverByJobUuid.has(a.job_id)) coverByJobUuid.set(a.job_id, a.url);
  }
  for (const a of assets) {
    if (a.kind === 'slide' && !coverByJobUuid.has(a.job_id)) coverByJobUuid.set(a.job_id, a.url);
  }

  const calJobs: CalJobRow[] = jobs.map((j) => ({
    job_id_motor: j.job_id_motor,
    campaign_id: j.campaign_id,
    type: j.type,
    coverUrl: coverByJobUuid.get(j.id) ?? null,
  }));

  return mapScheduledRows(rows, calJobs, { campaignId });
}

/** Realtime sobre scheduled_posts del cliente. Devuelve cleanup. */
export function subscribeMyCalendar(onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel('portal-calendar')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_posts' }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}
