import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitDrainEntries } from './drainBody.ts';

test('array JSON', () => assert.deepEqual(splitDrainEntries('[{"a":1},{"b":2}]'), [{ a: 1 }, { b: 2 }]));
test('NDJSON con línea corrupta y vacía', () =>
  assert.deepEqual(splitDrainEntries('{"a":1}\n\nnope\n{"b":2}\n'), [{ a: 1 }, { b: 2 }]));
test('objeto único y vacío', () => {
  assert.deepEqual(splitDrainEntries('{"a":1}'), [{ a: 1 }]);
  assert.deepEqual(splitDrainEntries(''), []);
});
