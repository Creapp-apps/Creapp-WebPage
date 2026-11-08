import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plural, summaryText, relativeTime, sortClientsByUrgency, sortPieces } from './contentTrackerView.ts';

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

test('plural y summaryText', () => {
  assert.equal(plural(1, 'pieza', 'piezas'), '1 pieza');
  assert.equal(plural(2, 'pieza', 'piezas'), '2 piezas');
  assert.equal(summaryText({ clients: 1, total: 1, approved: 1, changes: 1, pending: 0 }),
    '1 cliente · 1 pieza · 1 aprobada · 1 pidió cambios · 0 sin revisar');
  assert.equal(summaryText({ clients: 2, total: 5, approved: 2, changes: 2, pending: 1 }),
    '2 clientes · 5 piezas · 2 aprobadas · 2 pidieron cambios · 1 sin revisar');
});
