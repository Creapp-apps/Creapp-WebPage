import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaContainer, getContainerStatus, publishContainer } from './metaCronService.ts';

test('createMediaContainer hace POST con media_type y devuelve el id', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ id: 'container_123' }) } as any;
  }) as any;
  try {
    const id = await createMediaContainer({
      igAccountId: '1784140000', accessToken: 'tok',
      mediaType: 'REELS', mediaUrl: 'https://pub.r2.dev/a.mp4', caption: 'hola',
    });
    assert.equal(id, 'container_123');
    assert.match(calls[0].url, /\/1784140000\/media$/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.media_type, 'REELS');
    assert.equal(body.video_url, 'https://pub.r2.dev/a.mp4');
  } finally {
    globalThis.fetch = original;
  }
});

test('createMediaContainer tira error legible si Meta responde error', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false, status: 400,
    json: async () => ({ error: { message: 'Invalid video_url' } }),
  })) as any;
  try {
    await assert.rejects(
      () => createMediaContainer({ igAccountId: 'x', accessToken: 't', mediaType: 'REELS', mediaUrl: 'bad' }),
      /Invalid video_url/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('getContainerStatus devuelve status_code', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true, status: 200, json: async () => ({ status_code: 'FINISHED' }),
  })) as any;
  try {
    const s = await getContainerStatus({ containerId: 'c1', accessToken: 't' });
    assert.equal(s, 'FINISHED');
  } finally {
    globalThis.fetch = original;
  }
});

test('publishContainer hace POST a media_publish con creation_id', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ id: 'media_999' }) } as any;
  }) as any;
  try {
    const mediaId = await publishContainer({ igAccountId: '178', accessToken: 't', containerId: 'c1' });
    assert.equal(mediaId, 'media_999');
    assert.match(calls[0].url, /\/178\/media_publish$/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.creation_id, 'c1');
  } finally {
    globalThis.fetch = original;
  }
});
