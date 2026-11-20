import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRowsToContainerize, containerizeRow, resolveClientToken, classifyContainerStatus, selectRowsReadyToPublish, shouldPublish } from './publishQueuePhases.ts';

test('selectRowsToContainerize excluye filas que no están queued', () => {
  const now = new Date('2026-12-01T00:00:00Z');
  const rows = [
    { id: '1', status: 'queued', scheduled_at: '2026-12-01T10:00:00Z' },
    { id: '2', status: 'published', scheduled_at: '2026-12-01T10:00:00Z' },
  ] as any;
  const out = selectRowsToContainerize(rows, now);
  assert.deepEqual(out.map((r: any) => r.id), ['1']);
});

test('selectRowsToContainerize excluye filas a más de 20h', () => {
  const now = new Date('2026-12-01T00:00:00Z');
  const rows = [
    { id: '1', status: 'queued', scheduled_at: '2026-12-03T10:00:00Z' },
  ] as any;
  assert.deepEqual(selectRowsToContainerize(rows, now), []);
});

test('containerizeRow rechaza carrusel con menos de 2 urls sin llamar a Meta', async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => { called = true; return { ok: true, json: async () => ({}) }; }) as any;
  try {
    const res = await containerizeRow(
      { platform: 'instagram_carousel', media_r2_urls: ['a.png'] } as any, 'tok',
    );
    assert.equal(called, false);
    assert.match(res.error!, /2 o más imágenes/);
  } finally {
    globalThis.fetch = original;
  }
});

test('resolveClientToken tira error claro si falta la variable de entorno', () => {
  assert.throws(
    () => resolveClientToken('dental_ia', {}),
    /META_ACCESS_TOKEN__dental_ia/,
  );
});

test('resolveClientToken devuelve el valor si está seteada', () => {
  const env = { META_ACCESS_TOKEN__dental_ia: 'tok123' };
  assert.equal(resolveClientToken('dental_ia', env), 'tok123');
});

test('containerizeRow arma un reel con mediaType REELS', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push(init);
    return { ok: true, status: 200, json: async () => ({ id: 'c1' }) };
  }) as any;
  try {
    const res = await containerizeRow(
      { platform: 'instagram_reel', media_r2_urls: ['a.mp4'], ig_account_id: '178', caption: 'hi' } as any,
      'tok',
    );
    assert.equal(res.containerId, 'c1');
    assert.equal(JSON.parse(calls[0].body).media_type, 'REELS');
  } finally {
    globalThis.fetch = original;
  }
});

test('containerizeRow propaga cover_r2_url como coverUrl del reel', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push(init);
    return { ok: true, status: 200, json: async () => ({ id: 'c1' }) };
  }) as any;
  try {
    await containerizeRow(
      {
        platform: 'instagram_reel', media_r2_urls: ['a.mp4'], ig_account_id: '178',
        caption: 'hi', cover_r2_url: 'https://pub.r2.dev/cover.png',
      } as any,
      'tok',
    );
    const body = JSON.parse(calls[0].body);
    assert.equal(body.cover_url, 'https://pub.r2.dev/cover.png');
  } finally {
    globalThis.fetch = original;
  }
});

test('containerizeRow no manda cover_url si la fila no tiene cover_r2_url', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push(init);
    return { ok: true, status: 200, json: async () => ({ id: 'c1' }) };
  }) as any;
  try {
    await containerizeRow(
      { platform: 'instagram_reel', media_r2_urls: ['a.mp4'], ig_account_id: '178', cover_r2_url: null } as any,
      'tok',
    );
    const body = JSON.parse(calls[0].body);
    assert.equal('cover_url' in body, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('classifyContainerStatus mapea FINISHED/ERROR/EXPIRED/otros', () => {
  assert.equal(classifyContainerStatus('FINISHED'), 'ready');
  assert.equal(classifyContainerStatus('ERROR'), 'error');
  assert.equal(classifyContainerStatus('EXPIRED'), 'error');
  assert.equal(classifyContainerStatus('IN_PROGRESS'), 'still_waiting');
});

test('selectRowsReadyToPublish filtra por status ready y horario cumplido', () => {
  const now = new Date('2026-12-01T19:00:00Z');
  const rows = [
    { id: '1', status: 'ready', scheduled_at: '2026-12-01T18:00:00Z' },
    { id: '2', status: 'ready', scheduled_at: '2026-12-01T20:00:00Z' },
    { id: '3', status: 'containerizing', scheduled_at: '2026-12-01T18:00:00Z' },
  ] as any;
  assert.deepEqual(selectRowsReadyToPublish(rows, now).map((r: any) => r.id), ['1']);
});

test('shouldPublish es false si la fila releída ya no está ready (tick solapado)', () => {
  assert.equal(shouldPublish({ status: 'ready' } as any), true);
  assert.equal(shouldPublish({ status: 'publishing' } as any), false);
  assert.equal(shouldPublish({ status: 'published' } as any), false);
});
