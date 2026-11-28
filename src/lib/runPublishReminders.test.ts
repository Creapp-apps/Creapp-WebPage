import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLocalTime, localDayKey, localHour, localDayRangeUtc } from './runPublishReminders.js';

// AR = UTC-3 todo el año.

test('formatLocalTime: UTC → hora local AR (-3h)', () => {
  assert.equal(formatLocalTime('2026-11-28T12:00:00Z'), '09:00');
  assert.equal(formatLocalTime('2026-11-28T02:30:00Z'), '23:30'); // día anterior local
  assert.equal(formatLocalTime('2026-11-28T00:15:00Z'), '21:15');
});

test('localHour: hora local AR del instante', () => {
  assert.equal(localHour(new Date('2026-11-28T12:00:00Z')), 9);
  assert.equal(localHour(new Date('2026-11-28T12:59:00Z')), 9); // 9:xx local → digest dispara 9:00-9:45
  assert.equal(localHour(new Date('2026-11-28T02:00:00Z')), 23);
});

test('localDayKey: día local (no UTC) en el borde de medianoche', () => {
  // 02:00 UTC del 28 = 23:00 local del 27.
  assert.equal(localDayKey(new Date('2026-11-28T02:00:00Z')), '2026-11-27');
  assert.equal(localDayKey(new Date('2026-11-28T12:00:00Z')), '2026-11-28');
});

test('localDayRangeUtc: el día local arranca a las 03:00 UTC', () => {
  const { startUtc, endUtc } = localDayRangeUtc(new Date('2026-11-28T12:00:00Z'));
  assert.equal(startUtc, '2026-11-28T03:00:00.000Z');
  assert.equal(endUtc, '2026-11-29T03:00:00.000Z');
});
