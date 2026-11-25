// Tipos del calendario del cliente. Ver
// docs/superpowers/specs/2026-11-25-portal-cliente-shell-calendario-design.md §5.2

/** Fila de scheduled_posts proyectada a columnas seguras (sin error_message/raw). */
export interface SchedRowSafe {
  id: string;
  client_id: string; // SLUG (no uuid)
  job_id: string;    // = content_jobs.job_id_motor
  status: string;
  scheduled_at: string | null;
  cover_r2_url: string | null;
  media_r2_urls: string[] | null;
  caption: string | null;
  platform: string | null;
  permalink: string | null;
  published_media_id: string | null;
  updated_at: string;
}

/** content_jobs resuelto para el calendario (cover de fallback ya calculada por el service). */
export interface CalJobRow {
  job_id_motor: string;
  campaign_id: string;
  type: string | null;
  coverUrl: string | null;
}

export type PieceType = 'reel' | 'carousel' | 'story';

export type CellState = 'future' | 'published' | 'in_process';

export interface CalendarPiece {
  id: string;
  jobIdMotor: string;
  campaignId: string | null;
  date: Date | null;
  type: PieceType;
  platform: string | null;
  coverUrl: string | null;
  mediaUrls: string[];
  caption: string | null;
  permalink: string | null;
  published: boolean;
}
