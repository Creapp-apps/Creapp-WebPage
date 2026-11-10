import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAccessStatus } from './portalOnboardingMapper.ts';

test('sin members => none', () => {
  assert.equal(deriveAccessStatus([], {}), 'none');
});
test('member sin login => invited', () => {
  assert.equal(deriveAccessStatus([{ user_id: 'u' }], { u: null }), 'invited');
});
test('member sin dato de login => invited', () => {
  assert.equal(deriveAccessStatus([{ user_id: 'u' }], {}), 'invited');
});
test('member con login => active', () => {
  assert.equal(deriveAccessStatus([{ user_id: 'u' }], { u: '2026-11-09T10:00:00Z' }), 'active');
});
test('dos members, uno con login => active', () => {
  assert.equal(
    deriveAccessStatus([{ user_id: 'a' }, { user_id: 'b' }], { a: null, b: '2026-11-09T10:00:00Z' }),
    'active',
  );
});
