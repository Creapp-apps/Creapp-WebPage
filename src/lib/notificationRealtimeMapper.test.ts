import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDbNotification, dbNotifId } from './notificationRealtimeMapper.ts';

const changes = {
  id: 'row-1',
  type: 'content_changes_requested',
  title: 'Cliente pidió cambios',
  body: 'Cardoso pidió cambios en R1: "más corto"',
  url: '/admin/contenido',
  metadata: { job_id: 'j1' },
  created_at: '2026-11-09T12:00:00Z',
};
const approved = { ...changes, id: 'row-2', type: 'content_approved', title: 'Cliente aprobó', body: 'Aprobó R2', url: null, metadata: null };

test('content_changes_requested se mapea', () => {
  const n = mapDbNotification(changes);
  assert.equal(n.id, dbNotifId('row-1'));
  assert.equal(n.title, 'Cliente pidió cambios');
  assert.equal(n.body, 'Cardoso pidió cambios en R1: "más corto"');
  assert.equal(n.url, '/admin/contenido');
  assert.equal(n.read, false);
  assert.equal(n.createdAt, '2026-11-09T12:00:00Z');
  assert.equal(n.data?.type, 'content_changes_requested');
  assert.equal(n.data?.job_id, 'j1');
});

test('content_approved sin url ni metadata', () => {
  const n = mapDbNotification(approved);
  assert.equal(n.data?.type, 'content_approved');
  assert.equal(n.url, '/admin');
  assert.equal(n.read, false);
});

test('mismo row id, mismo id estable', () => {
  assert.equal(mapDbNotification(changes).id, mapDbNotification({ ...changes }).id);
  assert.notEqual(mapDbNotification(changes).id, mapDbNotification(approved).id);
});
