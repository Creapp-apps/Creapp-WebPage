import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderReview, firstPendingIndex, nextPendingIndex, reviewSummary } from './reviewQueue';

test('orderReview: reel → carousel → story, estable', () => {
  const out = orderReview([
    { type: 'story', id: 'a' }, { type: 'reel', id: 'b' },
    { type: 'carousel', id: 'c' }, { type: 'reel', id: 'd' },
  ]);
  assert.deepEqual(out.map((p) => p.id), ['b', 'd', 'c', 'a']);
});

test('firstPendingIndex: primera pieza sent', () => {
  assert.equal(firstPendingIndex([{ status: 'approved' }, { status: 'sent' }, { status: 'sent' }]), 1);
});

test('firstPendingIndex: ninguna pendiente → 0', () => {
  assert.equal(firstPendingIndex([{ status: 'approved' }, { status: 'changes_requested' }]), 0);
  assert.equal(firstPendingIndex([]), 0);
});

test('nextPendingIndex: hacia adelante', () => {
  assert.equal(nextPendingIndex([{ status: 'approved' }, { status: 'sent' }, { status: 'sent' }], 1), 2);
});

test('nextPendingIndex: envuelve hacia atrás', () => {
  assert.equal(nextPendingIndex([{ status: 'sent' }, { status: 'approved' }, { status: 'approved' }], 0), null);
  assert.equal(nextPendingIndex([{ status: 'sent' }, { status: 'approved' }, { status: 'sent' }], 2), 0);
});

test('nextPendingIndex: nada pendiente → null', () => {
  assert.equal(nextPendingIndex([{ status: 'approved' }, { status: 'changes_requested' }], 0), null);
});

test('reviewSummary: cuenta approved/changes/pending', () => {
  assert.deepEqual(
    reviewSummary([{ status: 'approved' }, { status: 'sent' }, { status: 'changes_requested' }]),
    { total: 3, approved: 1, changes: 1, pending: 1 },
  );
});
