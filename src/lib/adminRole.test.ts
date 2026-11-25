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
  assert.equal(resolveIsAdmin({ email: ' CreApp.AR@gmail.com ' }), true);
});
test('prefijo admin@ de dominio ajeno NO es admin', () => {
  assert.equal(resolveIsAdmin({ email: 'admin@algo.com' }), false);
  assert.equal(resolveIsAdmin({ email: 'admin@consultorio.com', profileRole: null }), false);
});
test('el rol de la base manda sobre el email por defecto', () => {
  assert.equal(resolveIsAdmin({ email: 'creapp.ar@gmail.com', profileRole: 'client' }), false);
  assert.equal(resolveIsAdmin({ email: 'admin@creapp.com.ar', profileRole: 'vendedor' }), false);
});
