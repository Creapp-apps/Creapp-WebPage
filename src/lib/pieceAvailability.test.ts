import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAvailabilityMap } from './pieceAvailability';

test('buildAvailabilityMap: url vacía=false; head decide el resto', async () => {
  const head = async (u: string) => u === 'live';
  const out = await buildAvailabilityMap({ a: 'live', b: 'dead', c: null }, head);
  assert.deepEqual(out, { a: true, b: false, c: false });
});
