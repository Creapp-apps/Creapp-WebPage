import type { TrackerCampaign, TrackerClient, TrackerCounts, TrackerOverview, TrackerPiece, TrackerPieceStatus } from './contentTrackerTypes.ts';

export interface TClientRow { id: string; slug: string; name: string; logo_url: string | null }
export interface TCampaignRow { id: string; client_id: string; title: string | null; month: string | null }
export interface TJobRow { id: string; campaign_id: string; client_id: string; type: string; title: string | null }
export interface TAssetRow { job_id: string; kind: string; url: string }
export interface TApprovalRow { job_id: string; client_user_id: string; decision: string; comment: string | null; created_at: string }
export interface TProfileRow { id: string; email: string | null; full_name: string | null }

const COVER_KINDS = new Set(['cover_9_16', 'slide']);

export function mapTracker(
  clients: TClientRow[], campaigns: TCampaignRow[], jobs: TJobRow[],
  assets: TAssetRow[], approvals: TApprovalRow[], profiles: TProfileRow[],
): TrackerOverview {
  const profileById = new Map(profiles.map(p => [p.id, p]));

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
    const status: TrackerPieceStatus =
      a?.decision === 'approved' ? 'approved' : a?.decision === 'changes_requested' ? 'changes_requested' : 'sent';
    const prof = a ? profileById.get(a.client_user_id) : undefined;
    return {
      id: j.id, type: j.type, title: j.title,
      coverUrl: cover.get(j.id) ?? null,
      status,
      lastComment: a ? (a.comment ?? null) : null,
      lastDecisionAt: a ? a.created_at : null,
      lastDecisionBy: a ? (prof?.full_name || prof?.email || null) : null,
    };
  };

  const empty = (): TrackerCounts => ({ total: 0, approved: 0, changes: 0, pending: 0 });
  const totals = { clients: clients.length, ...empty() };

  const out: TrackerClient[] = clients.map(c => {
    const counts = empty();
    const camps: TrackerCampaign[] = campaigns.filter(k => k.client_id === c.id).map(k => {
      const pieces = jobs.filter(j => j.campaign_id === k.id).map(toPiece);
      for (const p of pieces) {
        counts.total++;
        if (p.status === 'approved') counts.approved++;
        else if (p.status === 'changes_requested') counts.changes++;
        else counts.pending++;
      }
      return { id: k.id, title: k.title, month: k.month, pieces };
    });
    totals.total += counts.total; totals.approved += counts.approved;
    totals.changes += counts.changes; totals.pending += counts.pending;
    return { id: c.id, slug: c.slug, name: c.name, logoUrl: c.logo_url, campaigns: camps, counts };
  });

  return { clients: out, totals };
}
