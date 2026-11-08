export type TrackerPieceStatus = 'sent' | 'approved' | 'changes_requested';

export interface TrackerPiece {
  id: string;
  type: string;
  title: string | null;
  coverUrl: string | null;
  status: TrackerPieceStatus;
  lastComment: string | null;
  lastDecisionAt: string | null;
  lastDecisionBy: string | null;
  clientVisible: boolean;
  sentAt: string | null;
  productionStage: string | null;
  rendered: boolean;
  jobIdMotor: string;
}

export interface TrackerCampaign {
  id: string;
  title: string | null;
  month: string | null;
  slug: string;
  status: 'active' | 'closed';
  pieces: TrackerPiece[];
}

export interface TrackerCounts { total: number; approved: number; changes: number; pending: number; drafts: number }

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
