import type { LaunchPiece, ScheduledPostRow } from './launchesTypes';
import { isStuck } from './launchesView';

export interface LClientRow { id: string; slug: string; name: string }
export interface LJobRow { id: string; client_id: string; type: string | null; title: string | null; job_id_motor: string }
export interface LAssetRow { job_id: string; kind: string; url: string }
export type LScheduledRow = ScheduledPostRow & { scheduled_at?: string | null };

const COVER_KINDS = new Set(['cover_9_16', 'slide']);

/** Une scheduled_posts con cliente/pieza/portada. scheduled_posts.client_id es el SLUG; job_id es job_id_motor. */
export function mapLaunchPieces(
  posts: LScheduledRow[], clients: LClientRow[], jobs: LJobRow[], assets: LAssetRow[],
  cronHealthy: boolean, now: Date,
): LaunchPiece[] {
  const clientBySlug = new Map(clients.map((c) => [c.slug, c]));
  const slugById = new Map(clients.map((c) => [c.id, c.slug]));
  const jobByKey = new Map<string, LJobRow>();
  for (const j of jobs) jobByKey.set(`${slugById.get(j.client_id)}:${j.job_id_motor}`, j);
  const cover = new Map<string, string>();
  for (const a of assets) if (COVER_KINDS.has(a.kind) && !cover.has(a.job_id)) cover.set(a.job_id, a.url);

  return posts.map((p) => {
    const job = jobByKey.get(`${p.client_id}:${p.job_id}`);
    return {
      id: p.id,
      clientId: p.client_id,
      clientName: clientBySlug.get(p.client_id)?.name ?? p.client_id,
      jobId: p.job_id,
      title: job?.title ?? null,
      type: job?.type ?? null,
      coverUrl: job ? cover.get(job.id) ?? null : null,
      status: p.status,
      scheduledAt: p.scheduled_at ?? null,
      updatedAt: p.updated_at,
      errorMessage: p.error_message,
      permalink: p.permalink ?? null,
      stuck: isStuck(p, cronHealthy, now),
    };
  });
}
