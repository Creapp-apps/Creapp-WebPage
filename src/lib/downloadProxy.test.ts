import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizePiece, pickMediaUrl, safeFilename } from './downloadProxy';

test('authorizePiece: inexistente 404, ajeno 403, no-publicada 404, propia-publicada ok', () => {
  const row = (c: string, s: string) => ({ client_id: c, status: s, media_r2_urls: ['u'] });
  assert.deepEqual(authorizePiece(null, ['a']), { ok: false, status: 404 });
  assert.deepEqual(authorizePiece(row('b', 'published'), ['a']), { ok: false, status: 403 });
  assert.deepEqual(authorizePiece(row('a', 'scheduled'), ['a']), { ok: false, status: 404 });
  assert.deepEqual(authorizePiece(row('a', 'published'), ['a']), { ok: true });
});

test('authorizePiece: ownership 403 se evalua antes que published 404', () => {
  assert.deepEqual(authorizePiece({ client_id: 'b', status: 'draft', media_r2_urls: null }, ['a']), { ok: false, status: 403 });
});

test('pickMediaUrl devuelve el media por indice o null', () => {
  assert.equal(pickMediaUrl({ client_id: 'a', status: 'published', media_r2_urls: ['x', 'y'] }, 1), 'y');
  assert.equal(pickMediaUrl({ client_id: 'a', status: 'published', media_r2_urls: ['x'] }, 5), null);
  assert.equal(pickMediaUrl({ client_id: 'a', status: 'published', media_r2_urls: null }, 0), null);
});

test('safeFilename arma slug-type-fecha.ext', () => {
  assert.equal(
    safeFilename({ brand: 'Cardoso Propiedades', type: 'reel', date: '2026-11-20T12:00:00Z', url: 'https://r2/x/final.mp4' }),
    'cardoso-propiedades-reel-2026-11-20.mp4',
  );
});

test('safeFilename: date null usa pieza, ext default mp4, slug solo [a-z0-9-]', () => {
  assert.equal(
    safeFilename({ brand: 'Acme & Co. (Ñandú)!', type: 'carousel', date: null, url: 'https://r2/x/archivo' }),
    'acme-co-nandu-carousel-pieza.mp4',
  );
});

test('safeFilename: ext tomada del path ignorando query', () => {
  assert.equal(
    safeFilename({ brand: 'X', type: 'story', date: '2026-01-02', url: 'https://r2/x/a.png?v=3' }),
    'x-story-2026-01-02.png',
  );
});

test('safeFilename trata guion bajo como separador', () => {
  assert.equal(
    safeFilename({ brand: 'cardoso_propiedades', type: 'reel', date: '2026-11-20T12:00:00Z', url: 'https://r2/x/final.mp4' }),
    'cardoso-propiedades-reel-2026-11-20.mp4',
  );
});
