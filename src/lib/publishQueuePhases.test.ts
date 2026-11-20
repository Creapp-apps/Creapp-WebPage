import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRowsToContainerize, containerizeRow, resolveClientToken } from './publishQueuePhases.ts';

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
