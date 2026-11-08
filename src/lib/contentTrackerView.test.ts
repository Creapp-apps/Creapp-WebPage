import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plural, summaryText, relativeTime, sortClientsByUrgency, sortPieces, campaignProgress, needsAttention, sortCampaignsByAttention } from './contentTrackerView.ts';

const c = (name: string, changes: number, pending: number): any => ({
  name, counts: { total: 1, approved: 0, changes, pending },
});

test('relativeTime', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  assert.equal(relativeTime('2026-11-08T09:00:00Z', now), 'hace 3 h');
  assert.equal(relativeTime('2026-11-08T11:50:00Z', now), 'hace 10 min');
  assert.equal(relativeTime('2026-11-06T12:00:00Z', now), 'hace 2 días');
  assert.equal(relativeTime(null, now), '');
});

test('sortClientsByUrgency', () => {
  const r = sortClientsByUrgency([c('A', 0, 0), c('B', 0, 2), c('C', 1, 0)]);
  assert.deepEqual(r.map((x) => x.name), ['C', 'B', 'A']);
});

test('sortPieces', () => {
  const r = sortPieces([{ status: 'approved' }, { status: 'changes_requested' }, { status: 'sent' }] as any);
  assert.deepEqual(r.map((x) => x.status), ['changes_requested', 'sent', 'approved']);
});

test('plural y summaryText', () => {
  assert.equal(plural(1, 'pieza', 'piezas'), '1 pieza');
  assert.equal(plural(2, 'pieza', 'piezas'), '2 piezas');
  assert.equal(summaryText({ clients: 1, total: 1, approved: 1, changes: 1, pending: 0 }),
    '1 cliente · 1 pieza · 1 aprobada · 1 pidió cambios · 0 sin revisar');
  assert.equal(summaryText({ clients: 2, total: 5, approved: 2, changes: 2, pending: 1 }),
    '2 clientes · 5 piezas · 2 aprobadas · 2 pidieron cambios · 1 sin revisar');
});

test('pieceTitle fallback', async () => {
  const { pieceTitle } = await import('./contentTrackerView.ts');
  assert.equal(pieceTitle({ title: 'Hola', type: 'reel' }), 'Hola');
  assert.equal(pieceTitle({ title: null, type: 'carousel' }), 'Carrusel');
  assert.equal(pieceTitle({ title: '  ', type: 'x' }), 'Sin título');
});

const pc = (status: string, clientVisible = true): any => ({ status, clientVisible });

test('campaignProgress cuenta solo enviadas', () => {
  const camp: any = { pieces: [pc('approved'), pc('sent'), pc('approved', false), pc('sent', false)] };
  assert.deepEqual(campaignProgress(camp), { approved: 1, total: 2 });
});

test('needsAttention', () => {
  assert.equal(needsAttention(pc('changes_requested')), true);
  assert.equal(needsAttention(pc('changes_requested', false)), false);
  assert.equal(needsAttention(pc('sent')), false);
  assert.equal(needsAttention(pc('approved')), false);
});

test('sortCampaignsByAttention: atención primero, estable', () => {
  const k = (id: string, ...ps: any[]): any => ({ id, pieces: ps });
  const r = sortCampaignsByAttention([k('a', pc('approved')), k('b', pc('changes_requested')), k('c', pc('sent')), k('d', pc('changes_requested'))]);
  assert.deepEqual(r.map((x) => x.id), ['b', 'd', 'a', 'c']);
});
