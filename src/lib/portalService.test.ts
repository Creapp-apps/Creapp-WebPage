import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCampaign } from './portalMapper.ts';

const client = { name: 'Cardoso', logo_url: 'l.png', brand_colors: { primary: '#002655' } };
const campaign = { id: 'c1', title: 'Nov', month: '2026-11', concept: 'x', aesthetic_archetype: 'cinematic_broll' };
const jobs = [
  { id: 'j1', type: 'reel' as const, title: 'R1', caption: 'cap' },
  { id: 'j2', type: 'carousel' as const, title: 'C1', caption: null },
];
const assets = [
  { job_id: 'j1', kind: 'mp4', url: 'v.mp4' },
  { job_id: 'j1', kind: 'cover_9_16', url: 'c.png' },
  { job_id: 'j2', kind: 'slide', url: 's2.png', r2_key: 'a/slide_2.png' },
  { job_id: 'j2', kind: 'slide', url: 's1.png', r2_key: 'a/slide_1.png' },
  { job_id: 'j2', kind: 'pdf', url: 'd.pdf' },
];
const approvals = [
  { job_id: 'j1', decision: 'changes_requested' as const, created_at: '2026-11-01T10:00:00Z' },
  { job_id: 'j1', decision: 'approved' as const, created_at: '2026-11-02T10:00:00Z' },
];

test('maps assets, order and client', () => {
  const r = mapCampaign(client, campaign, jobs, assets, approvals);
  assert.equal(r.aesthetic, 'cinematic_broll');
  assert.equal(r.client.logoUrl, 'l.png');
  assert.deepEqual(r.pieces[0].mediaUrl, 'v.mp4');
  assert.deepEqual(r.pieces[0].coverUrl, 'c.png');
  assert.deepEqual(r.pieces[1].slides, ['s1.png', 's2.png']);
  assert.equal(r.pieces[1].caption, '');
});

test('status from latest approval, default sent', () => {
  const r = mapCampaign(client, campaign, jobs, assets, approvals);
  assert.equal(r.pieces[0].status, 'approved');
  assert.equal(r.pieces[1].status, 'sent');
});
