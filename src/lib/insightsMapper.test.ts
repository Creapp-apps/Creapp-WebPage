import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickClientSlug, isCacheFresh, canForceRefresh,
  mapAccountInsights, mapPieceInsights, topPieces, freshnessLabel,
  normalizeAccountDatum,
} from './insightsMapper';

const minsAgo = (now: Date, m: number) => new Date(now.getTime() - m * 60_000).toISOString();

test('pickClientSlug: default, miembro, ajeno, vacío', () => {
  const clients = [{ slug: 'dental_ia' }, { slug: 'materalia' }];
  assert.deepEqual(pickClientSlug(clients), { slug: 'dental_ia' });        // sin requested → primero
  assert.deepEqual(pickClientSlug(clients, 'materalia'), { slug: 'materalia' }); // miembro
  assert.deepEqual(pickClientSlug(clients, 'ajeno'), { error: 403 });      // no-miembro → 403
  assert.deepEqual(pickClientSlug([], null), { error: 404 });              // sin clientes
});

test('isCacheFresh: dentro/fuera de TTL y null', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  assert.equal(isCacheFresh(minsAgo(now, 10), now), true);   // 10<45
  assert.equal(isCacheFresh(minsAgo(now, 50), now), false);  // 50>45
  assert.equal(isCacheFresh(null, now), false);
});

test('canForceRefresh: piso 5 min y sin caché', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  assert.equal(canForceRefresh(null, now), true);
  assert.equal(canForceRefresh(minsAgo(now, 2), now), false); // 2<5
  assert.equal(canForceRefresh(minsAgo(now, 10), now), true); // 10>=5
});

test('normalizeAccountDatum: tolera values[] y total_value y nada', () => {
  // forma time_series → values[]
  assert.deepEqual(
    normalizeAccountDatum({ name: 'reach', values: [{ value: 3 }, { value: 7 }] } as any),
    [{ value: 3 }, { value: 7 }],
  );
  // forma total_value → se sintetiza un punto único
  assert.deepEqual(
    normalizeAccountDatum({ name: 'reach', total_value: { value: 42 } } as any),
    [{ value: 42 }],
  );
  // ninguna → null (se omite)
  assert.equal(normalizeAccountDatum({ name: 'reach' } as any), null);
});

test('mapAccountInsights: arma series/total, extrae followerCount, tolera ausentes', () => {
  const raw = [
    { name: 'reach', values: [{ value: 10, end_time: 'd1' }, { value: 5, end_time: 'd2' }] },
    { name: 'follower_count', values: [{ value: 120, end_time: 'd2' }] },
  ];
  const out = mapAccountInsights(raw as any);
  assert.equal(out.followerCount, 120);
  const reach = out.account.find((m) => m.key === 'reach')!;
  assert.equal(reach.total, 15);
  assert.equal(reach.series.length, 2);
  // follower_count no se duplica como tile de serie
  assert.equal(out.account.find((m) => m.key === 'follower_count'), undefined);
  // métrica ausente simplemente no está; no tira
  assert.equal(out.account.find((m) => m.key === 'profile_views'), undefined);
});

test('mapPieceInsights: pieza con datos y pieza nula, tipo por plataforma', () => {
  const rows = [
    { published_media_id: 'm1', platform: 'instagram_reel', cover_r2_url: 'c1', permalink: 'p1', caption: 'hola' },
    { published_media_id: 'm2', platform: 'instagram_carousel', cover_r2_url: null, permalink: null, caption: null },
  ];
  const byId = {
    m1: [{ name: 'reach', values: [{ value: 4 }] }, { name: 'likes', values: [{ value: 1 }] }, { name: 'saved', values: [{ value: 0 }] }],
    m2: null, // falló su fetch → métricas null, no rompe
  };
  const out = mapPieceInsights(rows as any, byId as any);
  assert.equal(out.length, 2);
  assert.equal(out[0].type, 'reel');
  assert.equal(out[0].reach, 4);
  assert.equal(out[0].likes, 1);
  assert.equal(out[1].type, 'carousel');
  assert.equal(out[1].reach, null);
});

test('topPieces: ordena desc por reach, nulls al final', () => {
  const pieces = [
    { mediaId: 'a', reach: 4 }, { mediaId: 'b', reach: null }, { mediaId: 'c', reach: 10 },
  ];
  const out = topPieces(pieces as any, 'reach');
  assert.deepEqual(out.map((p) => p.mediaId), ['c', 'a', 'b']);
});

test('freshnessLabel: min y horas', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  assert.equal(freshnessLabel(minsAgo(now, 3), now), 'hace 3 min');
  assert.ok(freshnessLabel(minsAgo(now, 125), now).includes('h'));
});
