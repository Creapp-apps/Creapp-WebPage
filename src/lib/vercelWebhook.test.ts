import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyVercelSignature, parseDrainLine, parseDeployEvent } from './vercelWebhook.ts';

const secret = 's3cret';
const body = '[{"a":1}]';
const sig = createHmac('sha1', secret).update(body).digest('hex');

test('firma válida pasa', () => assert.equal(verifyVercelSignature(body, sig, secret), true));
test('firma mala falla', () => {
  assert.equal(verifyVercelSignature(body, 'deadbeef', secret), false);
  assert.equal(verifyVercelSignature(body, sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0'), secret), false);
});
test('header vacío falla sin tirar', () => {
  assert.equal(verifyVercelSignature(body, '', secret), false);
  assert.equal(verifyVercelSignature(body, undefined as unknown as string, secret), false);
});
test('body alterado falla', () => assert.equal(verifyVercelSignature(body + ' ', sig, secret), false));

test('drain info de otro path -> null', () => {
  assert.equal(parseDrainLine({ level: 'info', message: 'hi', proxy: { path: '/api/other' } }), null);
});
test('drain error de otro path -> null', () => {
  assert.equal(parseDrainLine({ level: 'error', message: 'x', path: '/api/other' }), null);
});
test('drain info del cron -> null', () => {
  assert.equal(parseDrainLine({ level: 'info', path: '/api/cron/publish-queue' }), null);
});
test('drain error del cron -> objeto', () => {
  const e = { level: 'error', message: 'boom', deploymentId: 'dpl_1', requestId: 'r1', proxy: { path: '/api/cron/publish-queue' } };
  const r = parseDrainLine(e);
  assert.ok(r);
  assert.equal(r.message, 'boom');
  assert.equal(r.deployment_id, 'dpl_1');
  assert.equal(r.request_id, 'r1');
  assert.equal(r.level, 'error');
  assert.equal(r.request_path, '/api/cron/publish-queue');
});
test('drain error de path con sufijo (-foo) -> null', () => {
  assert.equal(parseDrainLine({ level: 'error', path: '/api/cron/publish-queue-foo' }), null);
});
test('drain basura -> null', () => {
  assert.equal(parseDrainLine(null), null);
  assert.equal(parseDrainLine('x'), null);
});

test('deploy event', () => {
  const p = { type: 'deployment.succeeded', payload: { deployment: { id: 'dpl_9', meta: { githubCommitSha: 'abc' } } } };
  const r = parseDeployEvent(p);
  assert.deepEqual({ ...r, raw: undefined }, { type: 'deployment.succeeded', deployment_id: 'dpl_9', git_sha: 'abc', state: 'succeeded', raw: undefined });
  assert.equal(parseDeployEvent({ type: 'deployment.created' }), null);
  assert.equal(parseDeployEvent(42), null);
});
