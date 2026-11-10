import test from 'node:test';
import assert from 'node:assert/strict';
import { pickBrandMark, campaignViewState, paletteSwatches, progressSummary, groupPieces, styleTags, pendingToApprove, typeMeta, pickCampaign } from './portalView.ts';

test('pickBrandMark: con logo devuelve el logo real', () => {
  assert.deepEqual(pickBrandMark({ name: 'Cardoso', logoUrl: 'https://r2/logo.png' }), { kind: 'logo', url: 'https://r2/logo.png', name: 'Cardoso' });
});

test('pickBrandMark: sin logo devuelve el nombre, nunca un monograma', () => {
  for (const logoUrl of [null, '', '   ']) {
    const m = pickBrandMark({ name: 'Mónica Cardoso Propiedades', logoUrl });
    assert.equal(m.kind, 'name');
    assert.equal((m as { name: string }).name, 'Mónica Cardoso Propiedades');
    assert.ok(!('initials' in m) && !('monogram' in m) && !('url' in m));
  }
});

test('campaignViewState', () => {
  assert.equal(campaignViewState(undefined), 'loading');
  assert.equal(campaignViewState(null), 'empty');
  assert.equal(campaignViewState({ pieces: [] } as never), 'empty');
  assert.equal(campaignViewState({ pieces: [{ id: 'a' }] } as never), 'ready');
});

test('paletteSwatches: usa brandColors validos, fallback neutro si falta', () => {
  assert.deepEqual(paletteSwatches({ primary: '#002655', accent: '#C08457', x: 'nope' }), ['#002655', '#C08457']);
  assert.ok(paletteSwatches(null).length >= 3);
});

test('progressSummary y groupPieces', () => {
  const p = [
    { id: '1', type: 'reel', status: 'approved' },
    { id: '2', type: 'reel', status: 'sent' },
    { id: '3', type: 'story', status: 'changes_requested' },
  ] as never[];
  assert.deepEqual(progressSummary(p), { total: 3, approved: 1, pending: 1, changes: 1, pendingIds: ['2'], pct: 33 });
  const g = groupPieces(p);
  assert.deepEqual(g.map((x) => [x.type, x.pieces.length]), [['reel', 2], ['story', 1]]);
});

test('styleTags', () => {
  assert.ok(styleTags('cinematic_broll').length > 0);
  assert.deepEqual(styleTags(null), []);
});

test('pendingToApprove: solo sent, nunca changes_requested ni approved', () => {
  const p = [{ id: '1', status: 'approved' as const }, { id: '2', status: 'sent' as const }, { id: '3', status: 'changes_requested' as const }];
  assert.deepEqual(pendingToApprove(p).map((x) => x.id), ['2']);
});

test('typeMeta: tipo desconocido no revienta', () => {
  assert.equal(typeMeta('reel').title, 'Reels');
  assert.equal(typeMeta('zzz').singular, 'Pieza');
});

test('pickCampaign: elige por id, cae a la más reciente (primera) si no existe o no hay id', () => {
  const cs = [{ id: 'a' }, { id: 'b' }] as any[];
  assert.equal(pickCampaign(cs, 'b')?.id, 'b');
  assert.equal(pickCampaign(cs, 'zzz')?.id, 'a');
  assert.equal(pickCampaign(cs, null)?.id, 'a');
  assert.equal(pickCampaign([], 'a'), null);
});
