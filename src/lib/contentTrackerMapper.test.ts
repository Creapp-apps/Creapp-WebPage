import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTracker } from './contentTrackerMapper.ts';

const clients = [
  { id: 'c1', slug: 'cardoso', name: 'Cardoso', logo_url: 'https://r2/l.png' },
  { id: 'c2', slug: 'vacio', name: 'Vacío', logo_url: null },
];
const campaigns = [
  { id: 'k1', client_id: 'c1', title: 'Noviembre', month: '2026-11-01', slug: 'noviembre', status: 'active' },
  { id: 'k2', client_id: 'c1', title: null, month: null, slug: 'sin-mes', status: 'closed' },
];
const jobs = [
  { id: 'j1', campaign_id: 'k1', client_id: 'c1', type: 'reel', title: 'R1', client_visible: true, sent_at: null, production_stage: null, rendered: true, job_id_motor: 'm' },
  { id: 'j2', campaign_id: 'k1', client_id: 'c1', type: 'carousel', title: 'C1', client_visible: true, sent_at: null, production_stage: null, rendered: true, job_id_motor: 'm' },
  { id: 'j3', campaign_id: 'k2', client_id: 'c1', type: 'reel', title: 'R2', client_visible: true, sent_at: null, production_stage: null, rendered: true, job_id_motor: 'm' },
];
const assets = [
  { job_id: 'j1', kind: 'mp4', url: 'https://r2/j1.mp4' },
  { job_id: 'j1', kind: 'cover_9_16', url: 'https://r2/j1.png' },
  { job_id: 'j2', kind: 'slide', url: 'https://r2/j2-s1.png' },
];
const approvals = [
  { job_id: 'j1', client_user_id: 'u1', decision: 'changes_requested', comment: 'viejo', created_at: '2026-11-01T10:00:00Z' },
  { job_id: 'j1', client_user_id: 'u1', decision: 'approved', comment: 'ok', created_at: '2026-11-02T10:00:00Z' },
  { job_id: 'j2', client_user_id: 'u2', decision: 'changes_requested', comment: 'cambiar', created_at: '2026-11-03T10:00:00Z' },
];
const profiles = [
  { id: 'u1', email: 'a@x.com', full_name: 'Ana' },
  { id: 'u2', email: 'b@x.com', full_name: null },
];

test('mapTracker agrupa cliente→campaña→pieza', () => {
  const r = mapTracker(clients, campaigns, jobs, assets, approvals, profiles);
  assert.equal(r.clients.length, 2);
  const c = r.clients[0];
  assert.equal(c.logoUrl, 'https://r2/l.png');
  assert.equal(c.campaigns.length, 2);
  assert.deepEqual(c.campaigns[0].pieces.map(p => p.id), ['j1', 'j2']);
  assert.equal(r.clients[1].campaigns.length, 0);
});

test('estado por última approval; sin approval = sent', () => {
  const r = mapTracker(clients, campaigns, jobs, assets, approvals, profiles);
  const [j1, j2] = r.clients[0].campaigns[0].pieces;
  assert.equal(j1.status, 'approved');
  assert.equal(j1.lastComment, 'ok');
  assert.equal(j1.lastDecisionAt, '2026-11-02T10:00:00Z');
  assert.equal(j1.lastDecisionBy, 'Ana');
  assert.equal(j2.status, 'changes_requested');
  assert.equal(j2.lastDecisionBy, 'b@x.com');
  const j3 = r.clients[0].campaigns[1].pieces[0];
  assert.equal(j3.status, 'sent');
  assert.equal(j3.lastComment, null);
  assert.equal(j3.lastDecisionAt, null);
  assert.equal(j3.lastDecisionBy, null);
});

test('coverUrl: primera cover/slide, sino null', () => {
  const r = mapTracker(clients, campaigns, jobs, assets, approvals, profiles);
  const [j1, j2] = r.clients[0].campaigns[0].pieces;
  assert.equal(j1.coverUrl, 'https://r2/j1.png');
  assert.equal(j2.coverUrl, 'https://r2/j2-s1.png');
  assert.equal(r.clients[0].campaigns[1].pieces[0].coverUrl, null);
});

test('counts por cliente y totals', () => {
  const r = mapTracker(clients, campaigns, jobs, assets, approvals, profiles);
  assert.deepEqual(r.clients[0].counts, { total: 3, approved: 1, changes: 1, pending: 1, drafts: 0 });
  assert.deepEqual(r.clients[1].counts, { total: 0, approved: 0, changes: 0, pending: 0, drafts: 0 });
  assert.deepEqual(r.totals, { clients: 2, total: 3, approved: 1, changes: 1, pending: 1, drafts: 0 });
});

const jb = (id: string, over: any = {}): any => ({ id, campaign_id: 'k1', client_id: 'c1', type: 'reel', title: id, client_visible: true, sent_at: null, production_stage: null, rendered: true, job_id_motor: 'm', ...over });

test('borrador: client_visible=false cuenta en drafts y no en buckets', () => {
  const r = mapTracker(clients, campaigns, [jb('d1', { client_visible: false }), jb('s1')], [], [], []);
  assert.deepEqual(r.clients[0].counts, { total: 2, approved: 0, changes: 0, pending: 1, drafts: 1 });
});

test('nueva versión: sent_at posterior a la última approval => sent', () => {
  const ap = [{ job_id: 'v1', client_user_id: 'u1', decision: 'approved', comment: null, created_at: '2026-11-02T10:00:00Z' }];
  const r = mapTracker(clients, campaigns, [jb('v1', { sent_at: '2026-11-05T10:00:00Z' }), jb('v2', { sent_at: '2026-11-01T10:00:00Z' })],
    [], [...ap, { ...ap[0], job_id: 'v2' }], profiles);
  const [v1, v2] = r.clients[0].campaigns[0].pieces;
  assert.equal(v1.status, 'sent');
  assert.equal(v2.status, 'approved');
});

test('campaña lleva slug y status normalizado', () => {
  const r = mapTracker(clients, campaigns, [], [], [], []);
  assert.equal(r.clients[0].campaigns[0].slug, 'noviembre');
  assert.equal(r.clients[0].campaigns[0].status, 'active');
  assert.equal(r.clients[0].campaigns[1].status, 'closed');
  const r2 = mapTracker(clients, [{ ...campaigns[0], status: 'raro' }], [], [], [], []);
  assert.equal(r2.clients[0].campaigns[0].status, 'active');
});
