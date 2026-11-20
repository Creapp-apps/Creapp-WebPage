import { getSupabase } from '@/lib/supabaseClient';
import { mapTracker, type TApprovalRow, type TAssetRow, type TCampaignRow, type TClientRow, type TJobRow, type TProfileRow, type TScheduledPostRow } from './contentTrackerMapper';
import type { TrackerOverview } from './contentTrackerTypes';

export type { TrackerOverview, TrackerClient, TrackerCampaign, TrackerPiece, TrackerPieceStatus, PublishStatus } from './contentTrackerTypes';

/** Solo lectura bajo RLS de equipo (anon key). */
export async function getTrackerOverview(): Promise<TrackerOverview> {
  const sb = getSupabase();
  // scheduled_posts es un agregado opcional (feature nueva, con una migración
  // de RLS que el equipo puede no haber aplicado todavía). Se dispara en
  // paralelo con el resto, pero su falla no tumba el tracker entero — el
  // estado de publicación simplemente no se muestra, en vez de que toda la
  // pantalla deje de cargar por una tabla que llegó después.
  const spPromise = sb.from('scheduled_posts').select('client_id, job_id, status, error_message');

  const [cl, ca, jo, as, ap, pr] = await Promise.all([
    sb.from('clients').select('id, slug, name, logo_url').order('name', { ascending: true }),
    sb.from('content_campaigns').select('id, client_id, title, month, slug, status')
      .order('month', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('content_jobs').select('id, campaign_id, client_id, type, title, client_visible, sent_at, production_stage, rendered, job_id_motor').order('created_at', { ascending: true }),
    sb.from('content_assets').select('job_id, kind, url').in('kind', ['cover_9_16', 'slide']).order('created_at', { ascending: true }),
    sb.from('content_approvals').select('job_id, client_user_id, decision, comment, created_at'),
    sb.from('user_profiles').select('id, email, full_name'),
  ]);
  for (const r of [cl, ca, jo, as, ap, pr]) if (r.error) throw r.error;

  let scheduledPosts: TScheduledPostRow[] = [];
  const sp = await spPromise;
  if (sp.error) {
    console.warn('[contentTracker] no se pudo leer scheduled_posts (¿falta aplicar la migración de RLS?):', sp.error.message);
  } else {
    scheduledPosts = (sp.data ?? []) as TScheduledPostRow[];
  }

  return mapTracker(
    (cl.data ?? []) as TClientRow[], (ca.data ?? []) as TCampaignRow[], (jo.data ?? []) as TJobRow[],
    (as.data ?? []) as TAssetRow[], (ap.data ?? []) as TApprovalRow[], (pr.data ?? []) as TProfileRow[],
    scheduledPosts,
  );
}

/** Realtime: llama onChange ante cambios en approvals/jobs/scheduled_posts. Devuelve cleanup. */
export function subscribeTracker(onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel('content-tracker')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_approvals' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_jobs' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_posts' }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}

/** Publica la pieza al cliente (RLS column-restricted: client_visible, sent_at). */
export async function sendPiece(jobId: string): Promise<void> {
  const { error } = await getSupabase().from('content_jobs')
    .update({ client_visible: true, sent_at: new Date().toISOString() }).eq('id', jobId);
  if (error) throw error;
}

/** Despublica la pieza (vuelve a borrador para el cliente). */
export async function unpublishPiece(jobId: string): Promise<void> {
  const { error } = await getSupabase().from('content_jobs')
    .update({ client_visible: false }).eq('id', jobId);
  if (error) throw error;
}

export async function setCampaignStatus(campaignId: string, status: 'active' | 'closed'): Promise<void> {
  const { error } = await getSupabase().from('content_campaigns')
    .update({ status }).eq('id', campaignId);
  if (error) throw error;
}
