import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPresence, mapPresence, presenceLabel, PRESENCE_UNREACHABLE } from './presence.ts';

const okFetch = (json: any) => (async () => ({ ok: true, json: async () => json })) as any;

test('conectada: mapea agent, edad, cwd y sesión', async () => {
  const r = await fetchPresence('http://x', okFetch({ connected: true, agent: 'claude-code', age_seconds: 5, cwd: '/repo/motor', session_id: 'abcdef123456' }));
  assert.deepEqual(r, { connected: true, agent: 'claude-code', ageSeconds: 5, reachable: true, cwd: '/repo/motor', sessionId: 'abcdef123456' });
});

test('fetch rechaza: no conectada, inalcanzable, sin throw', async () => {
  const r = await fetchPresence('http://x', (async () => { throw new Error('down'); }) as any);
  assert.deepEqual(r, { connected: false, agent: null, ageSeconds: null, reachable: false, cwd: null, sessionId: null });
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

test('presenceLabel: carpeta del repo + id corto', () => {
  const p = mapPresence({ connected: true, cwd: '/Users/x/Desktop/Creador de Contenidos', session_id: 'abcdef123456' });
  assert.equal(presenceLabel(p), '…/Creador de Contenidos · abcdef');
});

test('presenceLabel: sin datos → vacío', () => {
  assert.equal(presenceLabel(PRESENCE_UNREACHABLE), '');
});
