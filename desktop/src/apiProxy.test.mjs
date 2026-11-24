import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleApiProxy } from './apiProxy.mjs';

const config = { creappPath: '/app', googleMapsApiKey: '' };

function fakeRes() {
  return {
    status: null,
    headers: {},
    body: null,
    writeHead(s, h) { this.status = s; Object.assign(this.headers, h); },
    end(b) { this.body = b; },
  };
}

test('ignora rutas que no son /api/places/*', async () => {
  const res = fakeRes();
  const handled = await handleApiProxy(
    { pathname: '/admin', search: '', res, config },
    { importHandler: async () => { throw new Error('no debería importar'); } }
  );
  assert.equal(handled, false);
  assert.equal(res.status, null);
});

test('corre la función serverless y pipea su JSON', async () => {
  const res = fakeRes();
  let recibido = null;
  const fakeHandler = async (req, r) => {
    recibido = req;
    r.status(200).json({ success: true, results: [{ name: 'Local 1' }] });
  };
  const handled = await handleApiProxy(
    { pathname: '/api/places/search', search: 'query=dentistas&key=K123', method: 'GET', res, config },
    { importHandler: async (file) => { assert.equal(file, '/app/api/places/search.js'); return fakeHandler; } }
  );
  assert.equal(handled, true);
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { success: true, results: [{ name: 'Local 1' }] });
  assert.equal(recibido.query.key, 'K123');
});

test('usa key de config cuando el cliente no manda key', async () => {
  const res = fakeRes();
  let recibido = null;
  const handled = await handleApiProxy(
    { pathname: '/api/places/search', search: 'query=bares', res, config: { ...config, googleMapsApiKey: 'CFG_KEY' } },
    { importHandler: async () => async (req, r) => { recibido = req; r.status(200).json({ ok: true }); } }
  );
  assert.equal(handled, true);
  assert.equal(recibido.query.key, 'CFG_KEY');
});

test('segmento inválido = 400 (anti traversal)', async () => {
  const res = fakeRes();
  const handled = await handleApiProxy(
    { pathname: '/api/places/..%2f..%2fsecret', search: '', res, config },
    { importHandler: async () => { throw new Error('no importar'); } }
  );
  assert.equal(handled, true);
  assert.equal(res.status, 400);
});

test('función inexistente = 200 inocuo, nunca HTML', async () => {
  const res = fakeRes();
  const handled = await handleApiProxy(
    { pathname: '/api/places/reviews', search: 'place_id=abc', res, config },
    { importHandler: async () => undefined }
  );
  assert.equal(handled, true);
  assert.equal(res.status, 200);
  assert.match(res.headers['Content-Type'], /application\/json/);
  assert.equal(JSON.parse(res.body).success, false);
});

test('handler que tira = 502 JSON, no crashea', async () => {
  const res = fakeRes();
  const handled = await handleApiProxy(
    { pathname: '/api/places/search', search: '', res, config },
    { importHandler: async () => async () => { throw new Error('boom'); } }
  );
  assert.equal(handled, true);
  assert.equal(res.status, 502);
  assert.equal(JSON.parse(res.body).success, false);
});
