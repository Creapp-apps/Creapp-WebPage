import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studioSrc, preflightIdFromUrl } from './adminDeepLink.js';

test('studioSrc agrega ?preflight sólo si viene', () => {
  assert.equal(studioSrc('http://localhost:8000/', 'c1'), 'http://localhost:8000/?preflight=c1');
  assert.equal(studioSrc('http://localhost:8000/'), 'http://localhost:8000/');
});

test('studioSrc usa & si el base ya tiene query', () => {
  assert.equal(studioSrc('http://localhost:8000/?x=1', 'c1'), 'http://localhost:8000/?x=1&preflight=c1');
});

test('preflightIdFromUrl extrae el campaign_id del deep-link', () => {
  assert.equal(preflightIdFromUrl('/admin?tab=content_creator&preflight=c1'), 'c1');
  assert.equal(preflightIdFromUrl('/admin?preflight=camp%20a'), 'camp a');
  assert.equal(preflightIdFromUrl('/admin?tab=content_creator'), null);
  assert.equal(preflightIdFromUrl('/admin'), null);
});
