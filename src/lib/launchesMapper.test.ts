import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapLaunchPieces } from './launchesMapper';

test('une post con cliente, pieza y portada; detecta trabada', () => {
  const now = new Date('2026-11-21T12:00:00Z');
  const out = mapLaunchPieces(
    [{ id: 'p1', client_id: 'acme', job_id: 'j1', status: 'queued', error_message: null, updated_at: '2026-11-21T11:00:00Z', scheduled_at: '2026-11-21T13:00:00Z' }],
    [{ id: 'c1', slug: 'acme', name: 'Acme' }],
    [{ id: 'jid', client_id: 'c1', type: 'reel', title: 'Hola', job_id_motor: 'j1' }],
    [{ job_id: 'jid', kind: 'cover_9_16', url: 'u' }],
    true, now,
  );
  assert.equal(out[0].clientName, 'Acme');
  assert.equal(out[0].title, 'Hola');
  assert.equal(out[0].coverUrl, 'u');
  assert.equal(out[0].stuck, true);
});

test('sin match cae al slug', () => {
  const out = mapLaunchPieces(
    [{ id: 'p', client_id: 'x', job_id: 'z', status: 'published', error_message: null, updated_at: '2026-11-21T11:59:00Z' }],
    [], [], [], true, new Date('2026-11-21T12:00:00Z'));
  assert.equal(out[0].clientName, 'x');
  assert.equal(out[0].title, null);
  assert.equal(out[0].stuck, false);
});
