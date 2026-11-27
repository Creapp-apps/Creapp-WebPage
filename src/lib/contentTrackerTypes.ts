export type TrackerPieceStatus = 'sent' | 'approved' | 'changes_requested';

export type PublishStatus = 'queued' | 'containerizing' | 'ready' | 'publishing' | 'published' | 'error';

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
  publishStatus: PublishStatus | null;
  publishErrorMessage: string | null;
  /** Pieza publicada directo (vive solo en scheduled_posts, sin content_job/review). */
  live?: boolean;
}

export interface TrackerCampaign {
  id: string;
  title: string | null;
  month: string | null;
  slug: string;
  status: 'active' | 'closed';
  pieces: TrackerPiece[];
  /** Campaña en vivo: sintetizada desde scheduled_posts (el cliente publicó sin pasar por review). */
  live?: boolean;
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
