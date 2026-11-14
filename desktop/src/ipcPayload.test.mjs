import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toToastPayload } from './ipcPayload.mjs';

test('failed push -> subida con Reintentar', () => {
  const p = toToastPayload({ type: 'failed', label: 'git push', error: new Error('x') });
  assert.deepEqual(p, {
    title: 'No se pudo completar la subida',
    body: 'Falló "git push". Revisá tu conexión y reintentá.',
    action: 'Reintentar',
  });
});

test('failed pull -> mismo título', () => {
  const p = toToastPayload({ type: 'failed', label: 'git pull' });
  assert.equal(p.title, 'No se pudo completar la subida');
  assert.ok(p.body.includes('git pull'));
  assert.equal(p.action, 'Reintentar');
});

test('failed genérico', () => {
  const p = toToastPayload({ type: 'failed', label: 'sync assets' });
  assert.equal(p.title, 'No se pudo completar la subida');
  assert.ok(p.body.includes('sync assets'));
  assert.equal(p.action, 'Reintentar');
});

test('connection-lost', () => {
  const p = toToastPayload({ type: 'connection-lost' });
  assert.equal(p.title, 'Se perdió la conexión');
  assert.ok(p.body.length > 0);
  assert.equal('action' in p, false);
});

test('evento desconocido -> null', () => {
  assert.equal(toToastPayload({ type: 'success' }), null);
  assert.equal(toToastPayload(null), null);
});
