import { getSupabase } from '@/lib/supabaseClient';
import { mapCampaign, type AssetRow, type ApprovalRow, type CampaignRow, type ClientRow, type JobRow } from './portalMapper';
import { submitDecisionWith, type ApprovalClient } from './portalApproval';
import type { PortalCampaign, PortalDecision } from './portalTypes';

export type { PortalCampaign, PortalPiece, PortalDecision } from './portalTypes';

/**
 * Todas las campañas del cliente (RLS aísla), más reciente primero.
 * Sin N+1: 4 consultas en total (cliente, campañas, jobs por `in(campaign_id)`,
 * assets/approvals por `in(job_id)`), agrupadas en memoria.
 */
export async function getMyCampaigns(): Promise<PortalCampaign[]> {
  const sb = getSupabase();

  const { data: client, error: cErr } = await sb
    .from('client_public').select('name, logo_url, brand_colors').limit(1).maybeSingle();
  if (cErr) throw cErr;
  if (!client) return [];

  const { data: campaigns, error: kErr } = await sb
    .from('content_campaigns')
    .select('id, title, month, concept, aesthetic_archetype')
    .order('month', { ascending: false })
    .order('created_at', { ascending: false });
  if (kErr) throw kErr;
  const campRows = (campaigns ?? []) as CampaignRow[];
  if (campRows.length === 0) return [];

  const { data: jobs, error: jErr } = await sb
    .from('content_jobs').select('id, campaign_id, type, title, caption, description, hashtags, created_at')
    .in('campaign_id', campRows.map((c) => c.id)).order('created_at', { ascending: true });
  if (jErr) throw jErr;
  const jobRows = (jobs ?? []) as (JobRow & { campaign_id: string })[];
  const ids = jobRows.map((j) => j.id);

  let assets: AssetRow[] = [];
  let approvals: ApprovalRow[] = [];
  if (ids.length > 0) {
    const [a, p] = await Promise.all([
      sb.from('content_assets').select('job_id, kind, url, r2_key').in('job_id', ids),
      sb.from('content_approvals').select('job_id, decision, created_at').in('job_id', ids),
    ]);
    if (a.error) throw a.error;
    if (p.error) throw p.error;
    assets = (a.data ?? []) as AssetRow[];
    approvals = (p.data ?? []) as ApprovalRow[];
  }

  return campRows.map((camp) => {
    const cj = jobRows.filter((j) => j.campaign_id === camp.id);
    const set = new Set(cj.map((j) => j.id));
    return mapCampaign(
      client as ClientRow, camp, cj,
      assets.filter((x) => set.has(x.job_id)), approvals.filter((x) => set.has(x.job_id)),
    );
  });
}

/** Campaña más reciente (compat). */
export async function getMyCampaign(): Promise<PortalCampaign | null> {
  return (await getMyCampaigns())[0] ?? null;
}

export async function submitDecision(jobId: string, decision: PortalDecision, comment?: string): Promise<void> {
  return submitDecisionWith(getSupabase() as unknown as ApprovalClient, jobId, decision, comment);
}
