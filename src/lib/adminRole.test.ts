import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveIsAdmin } from './adminRole.js';

test('vendedor sin email admin no es admin', () => {
  assert.equal(resolveIsAdmin({ profileRole: 'vendedor', email: 'x@y.com' }), false);
});
test('client y rol desconocido no son admin', () => {
  assert.equal(resolveIsAdmin({ profileRole: 'client', email: 'x@y.com' }), false);
  assert.equal(resolveIsAdmin({ profileRole: null, email: 'x@y.com' }), false);
  assert.equal(resolveIsAdmin({}), false);
});
test('rol admin es admin', () => {
  assert.equal(resolveIsAdmin({ profileRole: 'admin' }), true);
});
test('email admin por defecto es admin aunque profileRole sea null', () => {
  assert.equal(resolveIsAdmin({ email: 'creapp.ar@gmail.com', profileRole: null }), true);
  assert.equal(resolveIsAdmin({ email: 'Admin@algo.com' }), true);
});
