import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planShare, nextFallback } from './sharePiece';

const F = {} as unknown as File;

test('planShare elige archivo, luego link, luego menú', () => {
  assert.equal(planShare({ file:F, permalink:'p', caps:{ canShareFiles:()=>true, canShareUrl:true } }), 'file');
  assert.equal(planShare({ file:F, permalink:'p', caps:{ canShareFiles:()=>false, canShareUrl:true } }), 'link');
  assert.equal(planShare({ file:null, permalink:null, caps:{ canShareFiles:()=>false, canShareUrl:false } }), 'menu');
});

test('nextFallback: file→link→menu→null', () => {
  assert.equal(nextFallback('file'), 'link');
  assert.equal(nextFallback('link'), 'menu');
  assert.equal(nextFallback('menu'), null);
});
