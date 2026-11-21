import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunStart, buildRunEnd } from './cronHeartbeat.ts';

test('buildRunEnd con errores -> outcome error y conteos', () => {
  const r = buildRunEnd([
    { id: 'a', status: 'published' },
    { id: 'b', status: 'error', error: 'boom' },
    { id: 'c', status: 'ready' },
  ]);
  assert.equal(r.outcome, 'error');
  assert.equal(r.processed_count, 3);
  assert.equal(r.published_count, 1);
  assert.equal(r.error_count, 1);
  assert.match(r.error_text ?? '', /boom/);
});

test('buildRunEnd todo ok', () => {
  const r = buildRunEnd([{ id: 'a', status: 'published' }]);
  assert.equal(r.outcome, 'ok');
  assert.equal(r.error_count, 0);
  assert.equal(r.error_text, null);
  assert.equal(buildRunEnd([]).outcome, 'ok');
});

test('buildRunStart incluye campos', () => {
  const r = buildRunStart({ VERCEL_DEPLOYMENT_ID: 'dpl_1', VERCEL_GIT_COMMIT_SHA: 'abc' });
  assert.equal(r.cron_name, 'publish-queue');
  assert.equal(r.deployment_id, 'dpl_1');
  assert.equal(r.git_sha, 'abc');
  assert.ok(!Number.isNaN(Date.parse(r.started_at)));
  assert.equal(buildRunStart({}).deployment_id, null);
});
