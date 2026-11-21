import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDebugToken } from './tokenHealth.js';

test('token válido con expiry', () => {
  const r = parseDebugToken({ data: { is_valid: true, expires_at: 1765000000 } });
  assert.deepEqual(r, { is_valid: true, expires_at: 1765000000, error: null });
});
test('expires_at 0 (nunca vence) => null', () => {
  const r = parseDebugToken({ data: { is_valid: true, expires_at: 0 } });
  assert.deepEqual(r, { is_valid: true, expires_at: null, error: null });
});
test('token inválido', () => {
  const r = parseDebugToken({ data: { is_valid: false, error: { message: 'expired' } } });
  assert.equal(r.is_valid, false);
  assert.equal(r.error, 'expired');
});
test('respuesta sin data => inválido', () => {
  const r = parseDebugToken({ error: { message: 'bad' } });
  assert.equal(r.is_valid, false);
  assert.equal(r.error, 'bad');
});
