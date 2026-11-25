import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePortalAccess, resolveAdminAccess, homePathForRole } from './portalAccess.ts';

const u = { id: 'u1' };

test('portal: client -> allow', () => {
  assert.equal(resolvePortalAccess({ loading: false, user: u, role: 'client' }), 'allow');
});
test('portal: admin/vendedor -> redirect-admin', () => {
  assert.equal(resolvePortalAccess({ loading: false, user: u, role: 'admin' }), 'redirect-admin');
  assert.equal(resolvePortalAccess({ loading: false, user: u, role: 'vendedor' }), 'redirect-admin');
});
test('portal: sin user -> login; loading -> loading', () => {
  assert.equal(resolvePortalAccess({ loading: false, user: null, role: 'client' }), 'login');
  assert.equal(resolvePortalAccess({ loading: true, user: null, role: 'client' }), 'loading');
});
test('admin guard: client -> redirect-portal', () => {
  assert.equal(resolveAdminAccess({ loading: false, user: u, role: 'client' }), 'redirect-portal');
  assert.equal(resolveAdminAccess({ loading: false, user: u, role: 'admin' }), 'allow');
  assert.equal(resolveAdminAccess({ loading: false, user: u, role: 'vendedor', allowedRoles: ['admin'] }), 'redirect-pipeline');
  assert.equal(resolveAdminAccess({ loading: false, user: null, role: 'admin' }), 'login');
});
test('home por rol', () => {
  assert.equal(homePathForRole('client'), '/portal');
  assert.equal(homePathForRole('admin'), '/admin');
  assert.equal(homePathForRole('vendedor'), '/admin');
});
test('portal sin sesión -> login (el guard lo manda a /portal/login)', () => {
  assert.equal(resolvePortalAccess({ loading: false, user: null, role: 'admin' }), 'login');
  assert.equal(homePathForRole('client'), '/portal');
});

test('rol sin verificar -> unverified en ambos guards (fail-closed)', () => {
  assert.equal(resolveAdminAccess({ loading: false, user: u, role: 'vendedor', roleResolved: false }), 'unverified');
  assert.equal(resolveAdminAccess({ loading: false, user: u, role: 'admin', roleResolved: false }), 'unverified');
  assert.equal(resolvePortalAccess({ loading: false, user: u, role: 'client', roleResolved: false }), 'unverified');
  assert.equal(resolveAdminAccess({ loading: true, user: u, role: 'vendedor', roleResolved: false }), 'loading');
  assert.equal(resolveAdminAccess({ loading: false, user: null, role: 'vendedor', roleResolved: false }), 'login');
});
