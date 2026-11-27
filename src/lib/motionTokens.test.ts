import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EASE, DUR, STAGGER, glideSettleOffsets } from '../components/site/motion/tokens';

test('tokens tienen los valores del spec', () => {
  assert.equal(EASE.qout, 'cubic-bezier(.25,1,.5,1)');
  assert.equal(EASE.cout, 'cubic-bezier(.33,1,.68,1)');
  assert.equal(EASE.cin, 'cubic-bezier(.32,0,.67,0)');
  assert.equal(DUR.base, 0.6);
  assert.equal(STAGGER, 0.08);
});

test('glideSettleOffsets: empieza cerca de 1, termina en 0, monotona', () => {
  const o = glideSettleOffsets(55);
  assert.equal(o.length, 55);
  assert.ok(o[0] > 0.9);
  assert.equal(o[o.length - 1], 0);
  for (let i = 1; i < o.length; i++) assert.ok(o[i] <= o[i - 1] + 1e-9);
});
