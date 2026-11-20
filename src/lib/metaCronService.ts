const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export interface CreateMediaContainerParams {
  igAccountId: string;
  accessToken: string;
  mediaType: 'VIDEO' | 'REELS' | 'STORIES' | 'IMAGE';
  mediaUrl: string;
  caption?: string;
  isCarouselItem?: boolean;
}

async function postJson(url: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Meta Graph API error (status ${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function createMediaContainer(params: CreateMediaContainerParams): Promise<string> {
  const { igAccountId, accessToken, mediaType, mediaUrl, caption, isCarouselItem } = params;
  const body: Record<string, unknown> = {
    media_type: mediaType,
    access_token: accessToken,
  };
  if (mediaType === 'IMAGE') {
    body.image_url = mediaUrl;
  } else {
    body.video_url = mediaUrl;
  }
  if (caption) {
    body.caption = caption;
  }
  if (isCarouselItem) {
    body.is_carousel_item = true;
  }
  const data = await postJson(`${GRAPH_API_BASE}/${igAccountId}/media`, body);
  return data.id;
}

export async function createCarouselContainer(params: {
  igAccountId: string;
  accessToken: string;
  mediaUrls: string[];
  caption?: string;
}): Promise<{ parentId: string; childIds: string[] }> {
  const { igAccountId, accessToken, mediaUrls, caption } = params;
  if (mediaUrls.length < 2) {
    throw new Error('Un carrusel necesita 2 o más imágenes');
  }
  const childIds: string[] = [];
  for (const mediaUrl of mediaUrls) {
    const childId = await createMediaContainer({
      igAccountId, accessToken, mediaType: 'IMAGE', mediaUrl, isCarouselItem: true,
    });
    childIds.push(childId);
  }
  const parentBody: Record<string, unknown> = {
    media_type: 'CAROUSEL',
    children: childIds,
    access_token: accessToken,
  };
  if (caption) {
    parentBody.caption = caption;
  }
  const parentData = await postJson(`${GRAPH_API_BASE}/${igAccountId}/media`, parentBody);
  return { parentId: parentData.id, childIds };
}

export async function getContainerStatus(params: {
  containerId: string;
  accessToken: string;
}): Promise<'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'> {
  const { containerId, accessToken } = params;
  const url = `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Meta Graph API error (status ${res.status})`;
    throw new Error(message);
  }
  return data.status_code;
}

export async function publishContainer(params: {
  igAccountId: string;
  accessToken: string;
  containerId: string;
}): Promise<string> {
  const { igAccountId, accessToken, containerId } = params;
  const data = await postJson(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
    creation_id: containerId,
    access_token: accessToken,
  });
  return data.id;
}
