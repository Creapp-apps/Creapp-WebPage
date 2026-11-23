// Filas crudas de Supabase para el centro de control "Lanzamientos".
// Columnas según supabase/migrations/20261121_lanzamientos_health.sql.

export interface CronRunRow {
  id: string;
  cron_name: string;
  started_at: string;
  finished_at: string | null;
  outcome: string | null; // 'ok' | 'error' | null (en curso)
  processed_count: number;
  published_count: number;
  error_count: number;
  error_text: string | null;
  deployment_id: string | null;
  git_sha: string | null;
}

export interface CronLogEventRow {
  id: string;
  received_at: string;
  deployment_id: string | null;
  request_id: string | null;
  level: string | null;
  message: string | null;
  request_path: string | null;
  raw: unknown;
}

export interface DeployEventRow {
  id: string;
  received_at: string;
  type: string | null;
  deployment_id: string | null;
  git_sha: string | null;
  state: string | null;
  raw: unknown;
}

export interface ScheduledPostRow {
  id: string;
  client_id: string;
  job_id: string;
  status: string; // queued | containerizing | ready | publishing | published | error | cancelled ...
  error_message: string | null;
  updated_at: string;
  scheduled_at?: string | null; // hora programada: decide si una queued ya es elegible para containerizar
  cover_r2_url?: string | null; // portada ya subida a R2 para publicar: fuente directa del thumbnail
  media_r2_urls?: string[] | null; // media final (reel mp4 / imágenes del carrusel) para la preview
  caption?: string | null; // copy que se publica, para la preview
  platform?: string | null; // instagram_reel | instagram_carousel | instagram_story | ...
  permalink?: string | null;
  published_media_id?: string | null;
}

// Inserts (sin id / received_at) para las tablas de ingesta de Vercel.
export interface CronLogEventInsert {
  deployment_id: string | null;
  request_id: string | null;
  level: string;
  message: string | null;
  request_path: string;
  raw: unknown;
}

export interface DeployEventInsert {
  type: string;
  deployment_id: string | null;
  git_sha: string | null;
  state: string;
  raw: unknown;
}

// ---- Tipos de vista (consumidos por la UI) ----
export interface LaunchPiece {
  id: string;
  clientId: string; // slug del cliente (como lo escribe el motor)
  clientName: string;
  jobId: string; // job_id del motor
  title: string | null;
  type: string | null;
  coverUrl: string | null;
  status: string;
  scheduledAt: string | null;
  updatedAt: string;
  errorMessage: string | null;
  permalink: string | null;
  stuck: boolean;
  mediaUrls: string[]; // media final para la preview (reel mp4 / imágenes del carrusel)
  caption: string | null; // copy que se publica
  platform: string | null; // instagram_reel | instagram_carousel | instagram_story | ...
}

export interface LaunchesOverview {
  pieces: LaunchPiece[];
  clients: { slug: string; name: string }[];
  cronRuns: CronRunRow[];
  logEvents: CronLogEventRow[];
  deployEvents: DeployEventRow[];
  /** Tablas de salud que fallaron al leerse (aisladas, no tumban la pantalla). */
  healthErrors: string[];
  fetchedAt: string;
}
