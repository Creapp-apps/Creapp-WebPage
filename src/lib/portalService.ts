import { getSupabase } from '@/lib/supabaseClient';
import { mapCampaign, type AssetRow, type ApprovalRow, type CampaignRow, type ClientRow, type JobRow } from './portalMapper';
import { submitDecisionWith, type ApprovalClient } from './portalApproval';
import type { PortalCampaign, PortalDecision } from './portalTypes';

export type { PortalCampaign, PortalPiece, PortalDecision } from './portalTypes';

/** Campaña más reciente del cliente autenticado (RLS aísla por cliente). */
export async function getMyCampaign(): Promise<PortalCampaign | null> {
  const sb = getSupabase();

  const { data: client, error: cErr } = await sb
    .from('client_public').select('name, logo_url, brand_colors').limit(1).maybeSingle();
  if (cErr) throw cErr;
  if (!client) return null;

  const { data: campaigns, error: kErr } = await sb
    .from('content_campaigns')
    .select('id, title, month, concept, aesthetic_archetype')
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (kErr) throw kErr;
  const campaign = campaigns?.[0];
  if (!campaign) return null;

  const { data: jobs, error: jErr } = await sb
    .from('content_jobs').select('id, type, title, caption, created_at')
    .eq('campaign_id', campaign.id).order('created_at', { ascending: true });
  if (jErr) throw jErr;
  const jobRows = (jobs ?? []) as JobRow[];
  const ids = jobRows.map((j) => j.id);
  if (ids.length === 0) return mapCampaign(client as ClientRow, campaign as CampaignRow, [], [], []);

  const [{ data: assets, error: aErr }, { data: approvals, error: pErr }] = await Promise.all([
    sb.from('content_assets').select('job_id, kind, url, r2_key').in('job_id', ids),
    sb.from('content_approvals').select('job_id, decision, created_at').in('job_id', ids),
  ]);
  if (aErr) throw aErr;
  if (pErr) throw pErr;

  return mapCampaign(
    client as ClientRow, campaign as CampaignRow, jobRows,
    (assets ?? []) as AssetRow[], (approvals ?? []) as ApprovalRow[],
  );
}

export async function submitDecision(jobId: string, decision: PortalDecision, comment?: string): Promise<void> {
  return submitDecisionWith(getSupabase() as unknown as ApprovalClient, jobId, decision, comment);
}
