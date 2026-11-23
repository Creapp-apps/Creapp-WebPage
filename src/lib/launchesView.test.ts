import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCronHealth, isStuck, STALE_MIN, STUCK_MIN } from './launchesView.ts';

const now = new Date('2026-11-21T12:00:00Z');
const ago = (min: number) => new Date(now.getTime() - min * 60000).toISOString();
const run = (min: number, outcome: string | null = 'ok'): any => ({
  id: 'r' + min, cron_name: 'publish-queue', started_at: ago(min), finished_at: outcome ? ago(min) : null, outcome,
});
// scheduledInH: horas desde `now` hasta scheduled_at (default 1 = dentro de la ventana del cron).
const inH = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();
const row = (status: string, min: number, scheduledInH = 1): any => ({ id: 'p', status, updated_at: ago(min), scheduled_at: inH(scheduledInH) });

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
  assert.equal(isStuck(row('queued', 25), true, now), true); // queued dentro de la ventana y vieja
  assert.equal(isStuck(row('containerizing', 25), true, now), true);
  assert.equal(isStuck(row('queued', 25), false, now), false); // cron caído != trabada
  assert.equal(isStuck(row('published', 25), true, now), false);
  assert.equal(isStuck(row('queued', 20), true, now), false); // borde exclusivo (updated_at)
  assert.equal(isStuck(row('queued', 5), true, now), false);
  // El bug real: queued encolada hace rato pero con scheduled_at lejano NO está trabada.
  assert.equal(isStuck(row('queued', 25, 30 * 24), true, now), false); // dentro de 30 días
  assert.equal(isStuck(row('queued', 25, 21), true, now), false); // apenas fuera de la ventana (21h > 20h)
  assert.equal(isStuck(row('queued', 25, 19), true, now), true); // dentro de la ventana (19h)
  // containerizing viejo: trabado aunque su scheduled_at sea lejano (ya está en el pipeline).
  assert.equal(isStuck(row('containerizing', 25, 30 * 24), true, now), true);
  // queued sin scheduled_at confiable: no alarmar.
  assert.equal(isStuck({ id: 'p', status: 'queued', updated_at: ago(25) } as any, true, now), false);
});
