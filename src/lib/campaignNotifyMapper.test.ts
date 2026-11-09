import test from 'node:test';
import assert from 'node:assert/strict';
import { countChangesSince } from './campaignNotifyMapper.ts';

test('lastSentAt null: todas las visibles son nuevas', () => {
  const r = countChangesSince([
    { clientVisible: true, sentAt: '2026-11-01T10:00:00Z' },
    { clientVisible: true, sentAt: null },
  ], null);
  assert.deepEqual(r, { changedCount: 2, total: 2 });
});

test('lastSentAt intermedio cuenta solo las posteriores al último aviso', () => {
  const r = countChangesSince([
    { clientVisible: true, sentAt: '2026-11-01T10:00:00Z' },
    { clientVisible: true, sentAt: '2026-11-05T10:00:00Z' },
    { clientVisible: true, sentAt: null },
  ], '2026-11-03T00:00:00Z');
  assert.deepEqual(r, { changedCount: 1, total: 3 });
});

test('0 visibles: total 0', () => {
  assert.deepEqual(countChangesSince([], null), { changedCount: 0, total: 0 });
});

test('piezas no visibles no cuentan', () => {
  const r = countChangesSince([
    { clientVisible: false, sentAt: '2026-11-05T10:00:00Z' },
    { clientVisible: true, sentAt: '2026-11-05T10:00:00Z' },
  ], '2026-11-03T00:00:00Z');
  assert.deepEqual(r, { changedCount: 1, total: 1 });
});
