import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffPending, previewDeepLink, startPreviewWatch } from './previewWatch.mjs';

test('diffPending: nuevas por id + badge = cantidad', () => {
  const r = diffPending(new Set(['a']), [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(r.toNotify, [{ id: 'b' }]);
  assert.equal(r.badge, 2);
  assert.equal(r.nextIds.size, 2);
});

test('previewDeepLink arma el deep-link al tab Preview', () => {
  assert.equal(previewDeepLink('http://x/', '7'), 'http://x/admin?tab=content_creator&preview=7');
});

test('startPreviewWatch notifica las nuevas y setea el badge', async () => {
  const notified = [];
  let badge = -1;
  const fetchJson = async () => ({ previews: [{ id: '1', titulo: 'T', cliente: 'C' }] });
  const stop = startPreviewWatch({
    fetchJson,
    notify: (p) => notified.push(p),
    setBadge: (n) => { badge = n; },
    intervalMs: 999999,
    timers: globalThis,
  });
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  stop();
  assert.equal(notified.length, 1);
  assert.equal(notified[0].id, '1');
  assert.equal(badge, 1);
});
