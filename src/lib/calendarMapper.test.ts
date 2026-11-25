import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveType, toLocalDayKey, cellState, mapScheduledRows, monthGrid } from './calendarMapper';
import type { CalendarPiece } from './calendarTypes';

test('deriveType mapea plataforma', () => {
  assert.equal(deriveType('instagram_reel'), 'reel');
  assert.equal(deriveType('instagram_carousel'), 'carousel');
  assert.equal(deriveType('instagram_story'), 'story');
  assert.equal(deriveType(null), 'reel'); // default
});

test('toLocalDayKey respeta TZ AR cerca de medianoche', () => {
  // 02:00 UTC = 23:00 del día anterior en AR (UTC-3)
  assert.equal(toLocalDayKey('2026-12-02T02:00:00Z'), '2026-12-01');
  assert.equal(toLocalDayKey('2026-12-02T12:00:00Z'), '2026-12-02');
});

test('cellState: publicado gana; pasado-no-publicado = in_process; futuro = future', () => {
  const now = new Date('2026-12-05T12:00:00Z');
  const base: Omit<CalendarPiece, 'date' | 'published'> = { id:'x', jobIdMotor:'j', campaignId:'c', type:'reel', platform:'instagram_reel', coverUrl:null, mediaUrls:[], caption:null, permalink:null };
  assert.equal(cellState({ ...base, date: new Date('2026-12-10T12:00:00Z'), published:false }, now), 'future');
  assert.equal(cellState({ ...base, date: new Date('2026-12-01T12:00:00Z'), published:true }, now), 'published');
  // pasó su hora pero NO se publicó → honesto, no "published"
  assert.equal(cellState({ ...base, date: new Date('2026-12-01T12:00:00Z'), published:false }, now), 'in_process');
});

test('mapScheduledRows: scopea a la campaña activa y resuelve media con fallback', () => {
  const rows = [
    { id:'a', client_id:'cli', job_id:'m1', status:'published', scheduled_at:'2026-12-02T14:00:00Z', cover_r2_url:'cov1', media_r2_urls:['mp4'], caption:'hola', platform:'instagram_reel', permalink:'http://ig/a', published_media_id:'ig1', updated_at:'' },
    { id:'b', client_id:'cli', job_id:'m2', status:'queued',    scheduled_at:'2026-12-03T14:00:00Z', cover_r2_url:null,  media_r2_urls:null,  caption:null,  platform:'instagram_carousel', permalink:null, published_media_id:null, updated_at:'' },
    { id:'c', client_id:'cli', job_id:'m3', status:'queued',    scheduled_at:'2026-12-04T14:00:00Z', cover_r2_url:'cov3', media_r2_urls:['s1','s2'], caption:null, platform:'instagram_carousel', permalink:null, published_media_id:null, updated_at:'' },
  ];
  const jobs = [
    { job_id_motor:'m1', campaign_id:'C1', type:'reel', coverUrl:null },
    { job_id_motor:'m2', campaign_id:'C1', type:'carousel', coverUrl:'assetCov2' }, // fallback cover
    { job_id_motor:'m3', campaign_id:'C2', type:'carousel', coverUrl:null },        // otra campaña
  ];
  const out = mapScheduledRows(rows as any, jobs as any, { campaignId: 'C1' });
  assert.equal(out.length, 2);                 // 'c' queda afuera (otra campaña)
  assert.equal(out[0].published, true);
  assert.equal(out[0].coverUrl, 'cov1');       // cover de la fila
  assert.equal(out[1].coverUrl, 'assetCov2');  // fallback del job
  assert.deepEqual(out[1].mediaUrls, []);      // sin media → abrible igual
});

test('mapScheduledRows sin filas → []', () => {
  assert.deepEqual(mapScheduledRows([], [], { campaignId: 'C1' }), []);
});

test('monthGrid: 42 celdas, arranca lunes, posiciona el 1', () => {
  const g = monthGrid(2026, 11); // diciembre 2026 (1 = martes)
  assert.equal(g.length, 42);
  assert.equal(g[0], null);          // lunes 30-nov no pertenece
  assert.equal(g[1], '2026-12-01');  // martes
});
