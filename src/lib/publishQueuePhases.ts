import { createMediaContainer, createCarouselContainer } from './metaCronService.js';

export interface ScheduledPostRow {
  id: string;
  client_id: string;
  job_id: string;
  ig_account_id: string;
  platform: 'instagram_reel' | 'instagram_carousel' | 'instagram_story' | 'facebook_reel' | 'facebook_feed';
  media_r2_urls: string[];
  cover_r2_url: string | null;
  caption: string | null;
  scheduled_at: string;
  status: 'queued' | 'containerizing' | 'ready' | 'publishing' | 'published' | 'error';
  container_id: string | null;
  child_container_ids: string[] | null;
  published_media_id: string | null;
  error_message: string | null;
}

const CONTAINERIZE_WINDOW_HOURS = 20;

export function resolveClientToken(clientId: string, env: Record<string, string | undefined>): string {
  const token = env['META_ACCESS_TOKEN__' + clientId];
  if (!token) {
    throw new Error('Falta META_ACCESS_TOKEN__' + clientId);
  }
  return token;
}

export function selectRowsToContainerize(rows: ScheduledPostRow[], now: Date): ScheduledPostRow[] {
  const windowEnd = new Date(now.getTime() + CONTAINERIZE_WINDOW_HOURS * 60 * 60 * 1000);
  return rows.filter((row) => {
    if (row.status !== 'queued') return false;
    const scheduledAt = new Date(row.scheduled_at);
    return scheduledAt <= windowEnd;
  });
}

const MEDIA_TYPE_BY_PLATFORM: Partial<Record<ScheduledPostRow['platform'], 'REELS' | 'STORIES'>> = {
  instagram_reel: 'REELS',
  instagram_story: 'STORIES',
};

export async function containerizeRow(
  row: ScheduledPostRow,
  accessToken: string,
): Promise<{ containerId?: string; childContainerIds?: string[]; error?: string }> {
  if (row.platform === 'instagram_carousel') {
    if (row.media_r2_urls.length < 2) {
      return { error: 'Un carrusel necesita 2 o más imágenes' };
    }
    const { parentId, childIds } = await createCarouselContainer({
      igAccountId: row.ig_account_id,
      accessToken,
      mediaUrls: row.media_r2_urls,
      caption: row.caption ?? undefined,
    });
    return { containerId: parentId, childContainerIds: childIds };
  }

  const mediaType = MEDIA_TYPE_BY_PLATFORM[row.platform];
  if (!mediaType) {
    return { error: `Platform '${row.platform}' no soportada por containerizeRow` };
  }
  const containerId = await createMediaContainer({
    igAccountId: row.ig_account_id,
    accessToken,
    mediaType,
    mediaUrl: row.media_r2_urls[0],
    caption: row.caption ?? undefined,
    coverUrl: row.cover_r2_url ?? undefined,
  });
  return { containerId };
}

export function classifyContainerStatus(statusCode: string): 'ready' | 'still_waiting' | 'error' {
  if (statusCode === 'FINISHED') return 'ready';
  if (statusCode === 'ERROR' || statusCode === 'EXPIRED') return 'error';
  return 'still_waiting';
}

export function selectRowsReadyToPublish(rows: ScheduledPostRow[], now: Date): ScheduledPostRow[] {
  return rows.filter((row) => row.status === 'ready' && new Date(row.scheduled_at) <= now);
}

export function shouldPublish(freshRow: ScheduledPostRow): boolean {
  return freshRow.status === 'ready';
}
