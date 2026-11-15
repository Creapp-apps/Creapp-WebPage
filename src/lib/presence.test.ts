import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPresence, mapPresence } from './presence.ts';

const okFetch = (json: any) => (async () => ({ ok: true, json: async () => json })) as any;

test('conectada: mapea agent y edad', async () => {
  const r = await fetchPresence('http://x', okFetch({ connected: true, agent: 'claude-code', age_seconds: 5 }));
  assert.deepEqual(r, { connected: true, agent: 'claude-code', ageSeconds: 5, reachable: true });
});

test('fetch rechaza: no conectada, inalcanzable, sin throw', async () => {
  const r = await fetchPresence('http://x', (async () => { throw new Error('down'); }) as any);
  assert.deepEqual(r, { connected: false, agent: null, ageSeconds: null, reachable: false });
});

test('connected false: alcanzable', async () => {
  const r = await fetchPresence('http://x', okFetch({ connected: false }));
  assert.equal(r.connected, false);
  assert.equal(r.reachable, true);
  assert.deepEqual(mapPresence({ connected: false }).agent, null);
});

test('respuesta no ok: inalcanzable', async () => {
  const r = await fetchPresence('http://x', (async () => ({ ok: false, json: async () => ({}) })) as any);
  assert.equal(r.reachable, false);
});
