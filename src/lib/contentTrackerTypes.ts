export type TrackerPieceStatus = 'sent' | 'approved' | 'changes_requested';

export interface TrackerPiece {
  id: string;
  type: string;
  title: string;
  coverUrl: string | null;
  status: TrackerPieceStatus;
  lastComment: string | null;
  lastDecisionAt: string | null;
  lastDecisionBy: string | null;
}

export interface TrackerCampaign {
  id: string;
  title: string | null;
  month: string | null;
  pieces: TrackerPiece[];
}

export interface TrackerCounts { total: number; approved: number; changes: number; pending: number }

export interface TrackerClient {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  campaigns: TrackerCampaign[];
  counts: TrackerCounts;
}

export interface TrackerOverview {
  clients: TrackerClient[];
  totals: TrackerCounts & { clients: number };
}
