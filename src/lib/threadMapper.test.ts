import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThread } from './threadMapper.ts';

const profiles = {
  u1: { id: 'u1', full_name: 'Seba' },
  u2: { id: 'u2', full_name: null },
};
const msg = (id: string, role: 'team' | 'client', uid: string, at: string) =>
  ({ id, job_id: 'j', author_role: role, author_user_id: uid, body: 'b-' + id, created_at: at });

test('hilo vacío', () => {
  assert.deepEqual(buildThread([], [], {}), []);
});

test('orden cronológico con decisiones intercaladas y nombres', () => {
  const t = buildThread(
    [msg('m2', 'client', 'u2', '2026-11-08T12:00:00Z'), msg('m1', 'team', 'u1', '2026-11-08T10:00:00Z')],
    [{ job_id: 'j', client_user_id: 'u2', decision: 'changes_requested', comment: 'ajustar', created_at: '2026-11-08T11:00:00Z' }],
    profiles,
  );
  assert.deepEqual(t.map((e) => e.kind), ['message', 'decision', 'message']);
  assert.equal(t[0].authorName, 'Seba');
  assert.equal(t[1].authorRole, 'client');
  assert.equal(t[1].authorName, null);
  assert.equal(t[1].decision, 'changes_requested');
  assert.equal(t[1].body, 'ajustar');
  assert.equal(t[2].decision, null);
});

test('autor desconocido → null', () => {
  const t = buildThread([msg('m1', 'team', 'zz', '2026-11-08T10:00:00Z')], [], profiles);
  assert.equal(t[0].authorName, null);
});

test('timestamps iguales: desempate estable por id', () => {
  const at = '2026-11-08T10:00:00Z';
  const a = buildThread([msg('b', 'team', 'u1', at), msg('a', 'team', 'u1', at)], [], profiles);
  const b = buildThread([msg('a', 'team', 'u1', at), msg('b', 'team', 'u1', at)], [], profiles);
  assert.deepEqual(a.map((e) => e.id), ['a', 'b']);
  assert.deepEqual(b.map((e) => e.id), ['a', 'b']);
});
