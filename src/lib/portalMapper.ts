import type { PortalCampaign, PortalPiece } from './portalTypes.ts';

export type ClientRow = { name: string; logo_url: string | null; brand_colors: Record<string, string> | null };
export type CampaignRow = {
  id: string; title: string | null; month: string | null; concept: string | null;
  aesthetic_archetype: string | null;
};
export type JobRow = {
  id: string; type: PortalPiece['type']; title: string | null; caption: string | null; created_at?: string;
};
export type AssetRow = { job_id: string; kind: string; url: string; r2_key?: string | null };
export type ApprovalRow = { job_id: string; decision: 'approved' | 'changes_requested'; created_at: string };

export function mapCampaign(
  client: ClientRow,
  campaign: CampaignRow,
  jobs: JobRow[],
  assets: AssetRow[],
  approvals: ApprovalRow[],
): PortalCampaign {
  const pieces: PortalPiece[] = jobs.map((job) => {
    const own = assets.filter((a) => a.job_id === job.id);
    const slides = own
      .filter((a) => a.kind === 'slide')
      .sort((a, b) => (a.r2_key ?? a.url).localeCompare(b.r2_key ?? b.url, undefined, { numeric: true }))
      .map((a) => a.url);
    const last = approvals
      .filter((p) => p.job_id === job.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return {
      id: job.id,
      type: job.type,
      title: job.title ?? '',
      caption: job.caption ?? '',
      mediaUrl: own.find((a) => a.kind === 'mp4')?.url ?? null,
      coverUrl: own.find((a) => a.kind === 'cover_9_16')?.url ?? null,
      slides,
      status: last ? last.decision : 'sent',
    };
  });
  return {
    id: campaign.id,
    title: campaign.title,
    month: campaign.month,
    concept: campaign.concept,
    aesthetic: campaign.aesthetic_archetype,
    client: { name: client.name, logoUrl: client.logo_url, brandColors: client.brand_colors },
    pieces,
  };
}
