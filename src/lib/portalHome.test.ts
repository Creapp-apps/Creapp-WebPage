import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPublication, upcomingPublications } from './portalHome';

const now = new Date('2026-11-25T12:00:00Z');
const mk = (iso: string | null) => ({ date: iso ? new Date(iso) : null, id: iso });

test('nextPublication: la futura más cercana, ignora pasadas y null', () => {
  const items = [mk('2026-11-20T12:00:00Z'), mk('2026-11-30T12:00:00Z'), mk('2026-11-28T12:00:00Z'), mk(null)];
  assert.equal(nextPublication(items, now)?.id, '2026-11-28T12:00:00Z');
});

test('nextPublication: sin futuras → null', () => {
  assert.equal(nextPublication([mk('2026-11-20T12:00:00Z'), mk(null)], now), null);
});

test('upcomingPublications: solo futuras, asc, top N', () => {
  const items = [mk('2026-12-05T12:00:00Z'), mk('2026-11-20T12:00:00Z'), mk('2026-11-28T12:00:00Z'), mk('2026-11-30T12:00:00Z')];
  const out = upcomingPublications(items, now, 2);
  assert.deepEqual(out.map((x) => x.id), ['2026-11-28T12:00:00Z', '2026-11-30T12:00:00Z']);
});
