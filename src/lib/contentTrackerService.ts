import { getSupabase } from '@/lib/supabaseClient';
import { mapTracker, type TApprovalRow, type TAssetRow, type TCampaignRow, type TClientRow, type TJobRow, type TProfileRow } from './contentTrackerMapper';
import type { TrackerOverview } from './contentTrackerTypes';

export type { TrackerOverview, TrackerClient, TrackerCampaign, TrackerPiece, TrackerPieceStatus } from './contentTrackerTypes';

/** Solo lectura bajo RLS de equipo (anon key). */
export async function getTrackerOverview(): Promise<TrackerOverview> {
  const sb = getSupabase();
  const [cl, ca, jo, as, ap, pr] = await Promise.all([
    sb.from('clients').select('id, slug, name, logo_url').order('name', { ascending: true }),
    sb.from('content_campaigns').select('id, client_id, title, month')
      .order('month', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('content_jobs').select('id, campaign_id, client_id, type, title').order('created_at', { ascending: true }),
    sb.from('content_assets').select('job_id, kind, url').in('kind', ['cover_9_16', 'slide']).order('created_at', { ascending: true }),
    sb.from('content_approvals').select('job_id, client_user_id, decision, comment, created_at'),
    sb.from('user_profiles').select('id, email, full_name'),
  ]);
  for (const r of [cl, ca, jo, as, ap, pr]) if (r.error) throw r.error;
  return mapTracker(
    (cl.data ?? []) as TClientRow[], (ca.data ?? []) as TCampaignRow[], (jo.data ?? []) as TJobRow[],
    (as.data ?? []) as TAssetRow[], (ap.data ?? []) as TApprovalRow[], (pr.data ?? []) as TProfileRow[],
  );
}

/** Realtime: llama onChange ante cambios en approvals/jobs. Devuelve cleanup. */
export function subscribeTracker(onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel('content-tracker')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_approvals' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_jobs' }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}
