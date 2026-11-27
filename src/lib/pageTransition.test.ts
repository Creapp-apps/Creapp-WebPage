import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bezier, pageTransitionVariants, PAGE_ENTER_X, PAGE_EXIT_X } from '../components/site/motion/pageTransition';
import { EASE, DUR } from '../components/site/motion/tokens';

test('bezier parsea cout a [.33,1,.68,1]', () => {
  assert.deepEqual(bezier(EASE.cout), [0.33, 1, 0.68, 1]);
});

test('variants normales: desliz x + fade con tokens', () => {
  const v = pageTransitionVariants(false);
  assert.equal(v.initial.x, PAGE_ENTER_X);
  assert.equal(v.animate.x, 0);
  assert.equal(v.exit.x, PAGE_EXIT_X);
  assert.equal(v.animate.transition.duration, DUR.base);
  assert.deepEqual(v.animate.transition.ease, [0.33, 1, 0.68, 1]);
});

test('variants reduced-motion: sin x, solo fade', () => {
  const v = pageTransitionVariants(true);
  assert.equal(v.initial.x, undefined);
  assert.equal(v.exit.x, undefined);
  assert.equal(v.initial.opacity, 0);
  assert.equal(v.animate.opacity, 1);
});
