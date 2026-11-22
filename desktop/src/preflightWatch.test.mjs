import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffPending, preflightDeepLink } from './preflightWatch.mjs';

test('preflightDeepLink arma la ruta del tab Creador de Contenidos con ?preflight', () => {
  assert.equal(
    preflightDeepLink('http://127.0.0.1:4599/', 'stacked_noviembre_2026'),
    'http://127.0.0.1:4599/admin?tab=content_creator&preflight=stacked_noviembre_2026',
  );
});

test('diffPending: campañas nuevas se notifican y se cuentan', () => {
  const r = diffPending(new Set(), [{ campaign_id: 'c1' }, { campaign_id: 'c2' }]);
  assert.deepEqual(r.toNotify.map(c => c.campaign_id), ['c1', 'c2']);
  assert.equal(r.badge, 2);
  assert.deepEqual([...r.nextIds].sort(), ['c1', 'c2']);
});

test('diffPending: ya notificadas no re-notifican pero siguen contando', () => {
  const r = diffPending(new Set(['c1', 'c2']), [{ campaign_id: 'c1' }, { campaign_id: 'c2' }]);
  assert.deepEqual(r.toNotify, []);
  assert.equal(r.badge, 2);
});

test('diffPending: lista vacía limpia badge y notificados', () => {
  const r = diffPending(new Set(['c1']), []);
  assert.deepEqual(r.toNotify, []);
  assert.equal(r.badge, 0);
  assert.deepEqual([...r.nextIds], []);
});
