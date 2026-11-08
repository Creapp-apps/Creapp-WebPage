import { getSupabase } from '@/lib/supabaseClient';
import { mapCampaign, type AssetRow, type ApprovalRow, type CampaignRow, type ClientRow, type JobRow } from './portalMapper';
import type { PortalCampaign } from './portalTypes';

export type CampaignPreview = { campaign: PortalCampaign; draftJobIds: string[] };

/**
 * Preview del equipo: la campaña más reciente de un cliente, como la ve el
 * cliente pero incluyendo borradores. Lee con las policies de equipo (sesión
 * del admin/vendedor); no impersona al cliente ni escribe nada.
 */
export async function getCampaignPreview(clientId: string): Promise<CampaignPreview | null> {
  const sb = getSupabase();

  const { data: client, error: cErr } = await sb
    .from('clients').select('name, logo_url, brand_colors').eq('id', clientId).maybeSingle();
  if (cErr) throw cErr;
  if (!client) return null;

  const { data: campaigns, error: kErr } = await sb
    .from('content_campaigns')
    .select('id, title, month, concept, aesthetic_archetype')
    .eq('client_id', clientId)
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (kErr) throw kErr;
  const campaign = campaigns?.[0];
  if (!campaign) return null;

  const { data: jobs, error: jErr } = await sb
    .from('content_jobs').select('id, type, title, caption, created_at, client_visible')
    .eq('campaign_id', campaign.id).order('created_at', { ascending: true });
  if (jErr) throw jErr;
  const allJobs = (jobs ?? []) as Array<JobRow & { client_visible?: boolean | null }>;
  const draftJobIds = allJobs.filter((j) => !j.client_visible).map((j) => j.id);
  const jobRows: JobRow[] = allJobs.map(({ client_visible: _cv, ...j }) => j);
  const ids = jobRows.map((j) => j.id);
  if (ids.length === 0) {
    return { campaign: mapCampaign(client as ClientRow, campaign as CampaignRow, [], [], []), draftJobIds };
  }

  const [{ data: assets, error: aErr }, { data: approvals, error: pErr }] = await Promise.all([
    sb.from('content_assets').select('job_id, kind, url, r2_key').in('job_id', ids),
    sb.from('content_approvals').select('job_id, decision, created_at').in('job_id', ids),
  ]);
  if (aErr) throw aErr;
  if (pErr) throw pErr;

  return {
    campaign: mapCampaign(
      client as ClientRow, campaign as CampaignRow, jobRows,
      (assets ?? []) as AssetRow[], (approvals ?? []) as ApprovalRow[],
    ),
    draftJobIds,
  };
}
