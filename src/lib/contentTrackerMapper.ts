import type { PublishStatus, TrackerCampaign, TrackerClient, TrackerCounts, TrackerOverview, TrackerPiece, TrackerPieceStatus } from './contentTrackerTypes.ts';
import { deriveType, toLocalDayKey } from './calendarMapper.ts';

export interface TClientRow { id: string; slug: string; name: string; logo_url: string | null }
export interface TCampaignRow { id: string; client_id: string; title: string | null; month: string | null; slug: string; status: string }
export interface TJobRow { id: string; campaign_id: string; client_id: string; type: string; title: string | null; client_visible: boolean; sent_at: string | null; production_stage: string | null; rendered: boolean; job_id_motor: string }
export interface TAssetRow { job_id: string; kind: string; url: string }
export interface TApprovalRow { job_id: string; client_user_id: string; decision: string; comment: string | null; created_at: string }
export interface TProfileRow { id: string; email: string | null; full_name: string | null }
export interface TScheduledPostRow {
  client_id: string; job_id: string; status: string; error_message: string | null;
  // Columnas extra para el modo en vivo (grupo sintetizado desde scheduled_posts).
  id?: string; cover_r2_url?: string | null; scheduled_at?: string | null; platform?: string | null; caption?: string | null;
  media_r2_urls?: string[] | null; permalink?: string | null;
}

const COVER_KINDS = new Set(['cover_9_16', 'slide']);

const PUBLISH_STATUSES = new Set<PublishStatus>(['queued', 'containerizing', 'ready', 'publishing', 'published', 'error']);
/** Coacciona un status de scheduled_posts a PublishStatus; desconocido ('cancelled', etc.) => 'queued'. */
const toPublishStatus = (s: string | null | undefined): PublishStatus =>
  s && PUBLISH_STATUSES.has(s as PublishStatus) ? (s as PublishStatus) : 'queued';

export function mapTracker(
  clients: TClientRow[], campaigns: TCampaignRow[], jobs: TJobRow[],
  assets: TAssetRow[], approvals: TApprovalRow[], profiles: TProfileRow[],
  scheduledPosts: TScheduledPostRow[] = [],
): TrackerOverview {
  const profileById = new Map(profiles.map(p => [p.id, p]));

  // scheduled_posts.client_id lo escribe el motor con el SLUG del cliente
  // (el mismo que usa client_manager.get_client_integrations), no con el
  // uuid de content_jobs.client_id/clients.id. Hay que traducir antes de
  // armar la clave de join, o nunca matchea nada.
  const slugById = new Map(clients.map(c => [c.id, c.slug]));

  const scheduledByKey = new Map<string, TScheduledPostRow>();
  // Para el modo en vivo: todas las filas de un cliente, agrupadas por su SLUG.
  const scheduledBySlug = new Map<string, TScheduledPostRow[]>();
  for (const s of scheduledPosts) {
    const key = `${s.client_id}:${s.job_id}`;
    if (!scheduledByKey.has(key)) scheduledByKey.set(key, s);
    const arr = scheduledBySlug.get(s.client_id);
    if (arr) arr.push(s); else scheduledBySlug.set(s.client_id, [s]);
  }

  const latest = new Map<string, TApprovalRow>();
  for (const a of approvals) {
    const cur = latest.get(a.job_id);
    if (!cur || new Date(a.created_at).getTime() > new Date(cur.created_at).getTime()) latest.set(a.job_id, a);
  }

  const cover = new Map<string, string>();
  for (const a of assets) {
    if (COVER_KINDS.has(a.kind) && !cover.has(a.job_id)) cover.set(a.job_id, a.url);
  }

  const toPiece = (j: TJobRow): TrackerPiece => {
    const a = latest.get(j.id);
    let status: TrackerPieceStatus =
      a?.decision === 'approved' ? 'approved' : a?.decision === 'changes_requested' ? 'changes_requested' : 'sent';
    // Re-envío posterior a la última decisión => nueva versión, vuelve a "sin revisar".
    if (a && j.sent_at && new Date(j.sent_at).getTime() > new Date(a.created_at).getTime()) status = 'sent';
    const prof = a ? profileById.get(a.client_user_id) : undefined;
    const sp = scheduledByKey.get(`${slugById.get(j.client_id)}:${j.job_id_motor}`);
    return {
      id: j.id, type: j.type, title: j.title,
      coverUrl: cover.get(j.id) ?? null,
      status,
      lastComment: a ? (a.comment ?? null) : null,
      lastDecisionAt: a ? a.created_at : null,
      lastDecisionBy: a ? (prof?.full_name || prof?.email || null) : null,
      clientVisible: j.client_visible, sentAt: j.sent_at, productionStage: j.production_stage,
      rendered: j.rendered, jobIdMotor: j.job_id_motor,
      publishStatus: sp ? (sp.status as PublishStatus) : null,
      publishErrorMessage: sp ? sp.error_message : null,
    };
  };

  // Pieza en vivo: vive solo en scheduled_posts (sin content_job/review).
  const toLivePiece = (s: TScheduledPostRow): TrackerPiece => ({
    id: s.id ?? s.job_id,
    type: deriveType(s.platform ?? null),
    title: s.caption?.trim() || null,
    coverUrl: s.cover_r2_url ?? null,
    status: 'approved', // neutro: no se revisa ni se muestra en la variante live
    lastComment: null, lastDecisionAt: null, lastDecisionBy: null,
    clientVisible: true, sentAt: null, productionStage: null,
    rendered: true, jobIdMotor: s.job_id,
    publishStatus: toPublishStatus(s.status),
    publishErrorMessage: s.error_message ?? null,
    live: true,
    mediaUrls: s.media_r2_urls ?? [],
    caption: s.caption ?? null,
    permalink: s.permalink ?? null,
    publishAt: s.scheduled_at ?? null,
    platform: s.platform ?? null,
  });

  /** Campaña en vivo sintetizada desde las scheduled_posts del cliente (ordenadas por fecha). */
  const buildLiveCampaign = (slug: string, rows: TScheduledPostRow[]): TrackerCampaign => {
    const sorted = [...rows].sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));
    const dates = sorted.map(s => s.scheduled_at).filter((x): x is string => !!x);
    const earliest = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
    const month = earliest ? toLocalDayKey(earliest).slice(0, 7) : null; // YYYY-MM AR-local
    return { id: `live:${slug}`, title: null, month, slug, status: 'active', pieces: sorted.map(toLivePiece), live: true };
  };

  const empty = (): TrackerCounts => ({ total: 0, approved: 0, changes: 0, pending: 0, drafts: 0 });
  const totals = { clients: clients.length, ...empty() };

  const out: TrackerClient[] = clients.map(c => {
    const counts = empty();
    const camps: TrackerCampaign[] = campaigns.filter(k => k.client_id === c.id).map(k => {
      const pieces = jobs.filter(j => j.campaign_id === k.id).map(toPiece);
      for (const p of pieces) {
        counts.total++;
        if (!p.clientVisible) { counts.drafts++; continue; }
        if (p.status === 'approved') counts.approved++;
        else if (p.status === 'changes_requested') counts.changes++;
        else counts.pending++;
      }
      return { id: k.id, title: k.title, month: k.month, slug: k.slug, status: k.status === 'closed' ? 'closed' : 'active', pieces };
    });
    totals.total += counts.total; totals.approved += counts.approved;
    totals.changes += counts.changes; totals.pending += counts.pending; totals.drafts += counts.drafts;
    // Modo en vivo: sin content_campaigns pero con scheduled_posts (publicó directo).
    // Se sintetiza una campaña en vivo (igual que el portal). No toca los counts de review.
    let finalCamps = camps;
    if (camps.length === 0) {
      // Excluye canceladas: no son piezas activas del grupo en vivo (si no, se verían como "Programada").
      const liveRows = (scheduledBySlug.get(c.slug) ?? []).filter(s => s.status !== 'cancelled');
      if (liveRows.length > 0) finalCamps = [buildLiveCampaign(c.slug, liveRows)];
    }
    return { id: c.id, slug: c.slug, name: c.name, logoUrl: c.logo_url, campaigns: finalCamps, counts };
  });

  return { clients: out, totals };
}
