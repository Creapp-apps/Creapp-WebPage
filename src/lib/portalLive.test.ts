import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveCampaign, liveStats } from './portalLive';

const client = { name: 'Stacked', logoUrl: null, brandColors: null, brandFont: null };

test('buildLiveCampaign: live, pieces vacío, month del más temprano (AR)', () => {
  const c = buildLiveCampaign(client, [{ scheduled_at: '2026-11-30T12:00:00Z' }, { scheduled_at: '2026-11-23T14:00:00Z' }]);
  assert.equal(c.live, true);
  assert.equal(c.id, '__live__');
  assert.deepEqual(c.pieces, []);
  assert.equal(c.month, '2026-11');
  assert.equal(c.client.name, 'Stacked');
});

test('buildLiveCampaign: sin fechas → month null', () => {
  assert.equal(buildLiveCampaign(client, [{ scheduled_at: null }]).month, null);
});

test('liveStats: total, publicadas, próxima', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const p = [
    { date: new Date('2026-11-23T12:00:00Z'), published: true },
    { date: new Date('2026-11-28T12:00:00Z'), published: false },
    { date: new Date('2026-11-30T12:00:00Z'), published: false },
  ];
  const s = liveStats(p, now);
  assert.equal(s.total, 3);
  assert.equal(s.published, 1);
  assert.equal(s.next?.toISOString(), '2026-11-28T12:00:00.000Z');
});
