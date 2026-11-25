// Tipos de Insights del portal. Ver spec §6.4. (Sin demographics en P2: soft-goal
// que requiere ≥100 seguidores; follow-up.)

export type AccountMetric = {
  key: string;
  label: string;
  total: number;
  series: { t: string; v: number }[];
};

export type PieceType = 'reel' | 'carousel' | 'image';

export type PieceInsight = {
  mediaId: string;
  type: PieceType;
  coverUrl: string | null;
  permalink: string | null;
  caption: string | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saved: number | null;
  total: number | null;
};

export type InsightsPayload = {
  account: AccountMetric[];
  pieces: PieceInsight[];
  followerCount: number | null;
  needsConnection: boolean;
};

// Crudo de Graph.
export type RawMetric = { name: string; values: { value: number; end_time?: string }[] };

// Fila de scheduled_posts publicada (para per-piece).
export type PieceRow = {
  published_media_id: string;
  platform: string | null;
  cover_r2_url: string | null;
  permalink: string | null;
  caption: string | null;
};
