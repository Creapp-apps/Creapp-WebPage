import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCronHealth, isStuck, STALE_MIN, STUCK_MIN } from './launchesView.ts';

const now = new Date('2026-11-21T12:00:00Z');
const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
const run = (min: number, outcome: string | null = 'ok'): any => ({
  id: 'r' + min, cron_name: 'publish-queue', started_at: ago(min), finished_at: outcome ? ago(min) : null, outcome,
});
const row = (status: string, min: number): any => ({ id: 'p', status, updated_at: ago(min) });

test('constantes', () => {
  assert.equal(STALE_MIN, 18);
  assert.equal(STUCK_MIN, 20);
});

test('computeCronHealth', () => {
  assert.equal(computeCronHealth([], now).state, 'down');
  const ok = computeCronHealth([run(5)], now);
  assert.equal(ok.state, 'ok');
  assert.equal(ok.ageMin, 5);
  assert.equal(ok.lastRunAt, ago(5));
  assert.equal(computeCronHealth([run(25)], now).state, 'stale');
  assert.equal(computeCronHealth([run(18)], now).state, 'ok'); // borde inclusivo
  assert.equal(computeCronHealth([run(19)], now).state, 'stale');
  assert.equal(computeCronHealth([run(1, 'error'), run(5)], now).state, 'error');
  assert.equal(computeCronHealth([run(5), run(1, 'error')], now).state, 'error'); // orden irrelevante
});

test('isStuck', () => {
  assert.equal(isStuck(row('queued', 25), true, now), true);
  assert.equal(isStuck(row('containerizing', 25), true, now), true);
  assert.equal(isStuck(row('queued', 25), false, now), false);
  assert.equal(isStuck(row('published', 25), true, now), false);
  assert.equal(isStuck(row('queued', 20), true, now), false); // borde exclusivo
  assert.equal(isStuck(row('queued', 5), true, now), false);
});
