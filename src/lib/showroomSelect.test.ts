import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectPublishedPieces } from './showroomSelect';
import type { CalendarPiece } from './calendarTypes';

test('selectPublishedPieces: solo publicadas con media, más nuevas primero', () => {
  const mk = (id: string, published: boolean, media: string[], date: string | null): CalendarPiece => ({
    id, jobIdMotor: 'j', campaignId: 'c', type: 'reel',
    platform: 'instagram_reel', coverUrl: null, mediaUrls: media, caption: null, permalink: null,
    published, date: date ? new Date(date) : null,
  });
  const out = selectPublishedPieces([
    mk('old', true, ['u'], '2026-11-01T12:00:00Z'),
    mk('future', false, ['u'], '2026-12-01T12:00:00Z'),
    mk('nomedia', true, [], '2026-11-15T12:00:00Z'),
    mk('new', true, ['u'], '2026-11-20T12:00:00Z'),
  ]);
  assert.deepEqual(out.map(p => p.id), ['new', 'old']);
});

test('selectPublishedPieces: sin fecha va al final', () => {
  const mk = (id: string, date: string | null): CalendarPiece => ({
    id, jobIdMotor: 'j', campaignId: 'c', type: 'reel',
    platform: 'instagram_reel', coverUrl: null, mediaUrls: ['u'], caption: null, permalink: null,
    published: true, date: date ? new Date(date) : null,
  });
  const out = selectPublishedPieces([mk('nodate', null), mk('dated', '2026-11-01T12:00:00Z')]);
  assert.deepEqual(out.map(p => p.id), ['dated', 'nodate']);
});

test('selectPublishedPieces: no muta el arreglo de entrada', () => {
  const a: CalendarPiece = {
    id: 'a', jobIdMotor: 'j', campaignId: 'c', type: 'reel',
    platform: null, coverUrl: null, mediaUrls: ['u'], caption: null, permalink: null,
    published: true, date: new Date('2026-11-01T12:00:00Z'),
  };
  const b: CalendarPiece = { ...a, id: 'b', date: new Date('2026-11-05T12:00:00Z') };
  const input = [a, b];
  selectPublishedPieces(input);
  assert.deepEqual(input.map(p => p.id), ['a', 'b']);
});
