import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime, sortClientsByUrgency, sortPieces } from './contentTrackerView.ts';

const c = (name: string, changes: number, pending: number): any => ({
  name, counts: { total: 1, approved: 0, changes, pending },
});

test('relativeTime', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  assert.equal(relativeTime('2026-11-08T09:00:00Z', now), 'hace 3 h');
  assert.equal(relativeTime('2026-11-08T11:50:00Z', now), 'hace 10 min');
  assert.equal(relativeTime('2026-11-06T12:00:00Z', now), 'hace 2 días');
  assert.equal(relativeTime(null, now), '');
});

test('sortClientsByUrgency', () => {
  const r = sortClientsByUrgency([c('A', 0, 0), c('B', 0, 2), c('C', 1, 0)]);
  assert.deepEqual(r.map((x) => x.name), ['C', 'B', 'A']);
});

test('sortPieces', () => {
  const r = sortPieces([{ status: 'approved' }, { status: 'changes_requested' }, { status: 'sent' }] as any);
  assert.deepEqual(r.map((x) => x.status), ['changes_requested', 'sent', 'approved']);
});
