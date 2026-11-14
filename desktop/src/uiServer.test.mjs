import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { startUiServer } from './uiServer.mjs';

const config = { creappPath: '/app', uiPort: 5199 };
const dist = path.join('/app', 'dist');

function setup() {
  const files = new Map([
    [path.join(dist, 'index.html'), Buffer.from('<html>INDEX</html>')],
    [path.join(dist, 'assets', 'app.js'), Buffer.from('console.log(1)')],
    ['/app/secret', Buffer.from('SECRET')],
  ]);
  const fs = {
    readFile: async (p) => {
      if (!files.has(p)) { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; }
      return files.get(p);
    },
  };
  let handler; let listened;
  const http = {
    createServer: (h) => {
      handler = h;
      return {
        listen: (port, host, cb) => { listened = { port, host }; cb(); },
        close: (cb) => cb && cb(),
        on: () => {},
      };
    },
  };
  const request = (url) => new Promise((resolve) => {
    const res = {
      status: null, headers: {}, body: null,
      writeHead(s, h) { this.status = s; Object.assign(this.headers, h); },
      end(b) { this.body = b; resolve(this); },
    };
    handler({ url, method: 'GET' }, res);
  });
  return { http, fs, request, listened: () => listened };
}

test('sirve asset real con content-type js', async () => {
  const t = setup();
  const srv = await startUiServer(config, { http: t.http, fs: t.fs });
  const r = await t.request('/assets/app.js');
  assert.equal(r.status, 200);
  assert.match(r.headers['Content-Type'], /javascript/);
  assert.equal(r.body.toString(), 'console.log(1)');
  assert.equal(srv.url, 'http://127.0.0.1:5199/');
  assert.deepEqual(t.listened(), { port: 5199, host: '127.0.0.1' });
});

test('SPA fallback: ruta profunda y query devuelven index.html 200', async () => {
  const t = setup();
  await startUiServer(config, { http: t.http, fs: t.fs });
  for (const u of ['/admin', '/admin/clientes/3?x=1', '/']) {
    const r = await t.request(u);
    assert.equal(r.status, 200, u);
    assert.match(r.headers['Content-Type'], /text\/html/);
    assert.equal(r.body.toString(), '<html>INDEX</html>');
  }
});

test('path traversal no escapa de dist', async () => {
  const t = setup();
  await startUiServer(config, { http: t.http, fs: t.fs });
  for (const u of ['/../secret', '/%2e%2e/secret', '/assets/../../secret']) {
    const r = await t.request(u);
    assert.notEqual(r.body?.toString(), 'SECRET', u);
  }
});
