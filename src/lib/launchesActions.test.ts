import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRetry, canCancel, canReschedule, canForce, actionError } from './launchesActions.ts';

test('canCancel', () => {
  for (const s of ['queued', 'containerizing', 'ready']) assert.equal(canCancel(s), true);
  for (const s of ['publishing', 'published', 'cancelled', 'error']) assert.equal(canCancel(s), false);
});
test('canReschedule', () => {
  for (const s of ['queued', 'ready']) assert.equal(canReschedule(s), true);
  for (const s of ['containerizing', 'publishing', 'published', 'error', 'cancelled']) assert.equal(canReschedule(s), false);
});
test('canForce', () => {
  for (const s of ['queued', 'containerizing', 'ready']) assert.equal(canForce(s), true);
  for (const s of ['publishing', 'published', 'error', 'cancelled']) assert.equal(canForce(s), false);
});
test('canRetry: error or stuck, never published/cancelled', () => {
  assert.equal(canRetry('error'), true);
  assert.equal(canRetry('published'), false);
  assert.equal(canRetry('cancelled'), false);
  assert.equal(canRetry('queued'), false);
  assert.equal(canRetry('publishing', true), true);
  assert.equal(canRetry('published', true), false);
});
test('actionError', () => {
  assert.match(actionError('cancel', 'published')!, /ya está/);
  assert.match(actionError('cancel', 'publishing')!, /ya está/);
  assert.equal(actionError('cancel', 'queued'), null);
  assert.equal(actionError('retry', 'error'), null);
  assert.ok(actionError('retry', 'published'));
  assert.equal(actionError('retry', 'publishing', true), null);
  assert.ok(actionError('reschedule', 'containerizing'));
  assert.ok(actionError('force', 'error'));
});
