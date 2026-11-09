import test from 'node:test';
import assert from 'node:assert/strict';
import { sendPortalInvite, buildPortalInviteHtml } from './emailService.ts';

test('sendPortalInvite hace POST a /api/send-portal-invite y resuelve success', async () => {
  const original = globalThis.fetch;
  const calls: { url: string; init: any }[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ success: true }) } as any;
  }) as any;
  try {
    const params = {
      email: 'cliente@marca.com',
      fullName: 'Ana Pérez',
      brandName: 'Cardoso',
      activationLink: 'https://creapp.com.ar/portal/activar?token=abc',
    };
    const res = await sendPortalInvite(params);
    assert.deepEqual(res, { success: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/send-portal-invite');
    assert.equal(calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].init.body), params);
  } finally {
    globalThis.fetch = original;
  }
});

const baseParams = {
  email: 'cliente@marca.com',
  fullName: 'Ana Pérez',
  brandName: 'Cardoso',
  activationLink: 'https://creapp.com.ar/portal/activar?token=abc',
};

async function withFetch(mock: any, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('buildPortalInviteHtml escapa <, & y " en brandName, fullName y activationLink', () => {
  const html = buildPortalInviteHtml({
    email: 'x@y.com',
    fullName: 'A<b>"&"',
    brandName: 'Marca<script>&"',
    activationLink: 'https://x.com/?a=1&b="2"<z>',
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<b>'));
  assert.ok(!html.includes('<z>'));
  assert.ok(html.includes('Marca&lt;script&gt;&amp;&quot;'));
  assert.ok(html.includes('A&lt;b&gt;&quot;&amp;&quot;'));
  assert.ok(html.includes('https://x.com/?a=1&amp;b=&quot;2&quot;&lt;z&gt;'));
});

test('sendPortalInvite: 404 cae al fallback directo (sin API key no pega a Resend)', async () => {
  const urls: string[] = [];
  await withFetch(
    (async (url: any) => {
      urls.push(String(url));
      return { ok: false, status: 404, json: async () => ({}) } as any;
    }) as any,
    async () => {
      const res = await sendPortalInvite(baseParams);
      assert.equal(urls[0], '/api/send-portal-invite');
      assert.equal(res.success, false);
      assert.match(res.error ?? '', /VITE_RESEND_API_KEY/);
      assert.equal(urls.length, 1);
    }
  );
});

test('sendPortalInvite: respuesta 500 devuelve success:false con error y sin fallback', async () => {
  const urls: string[] = [];
  await withFetch(
    (async (url: any) => {
      urls.push(String(url));
      return { ok: false, status: 500, json: async () => ({ error: 'boom' }) } as any;
    }) as any,
    async () => {
      const res = await sendPortalInvite(baseParams);
      assert.deepEqual(res, { success: false, error: 'boom' });
      assert.equal(urls.length, 1);
    }
  );
});

test('sendPortalInvite: 400 sin cuerpo usa mensaje genérico con el status', async () => {
  await withFetch(
    (async () => ({ ok: false, status: 400, json: async () => { throw new Error('no json'); } }) as any) as any,
    async () => {
      const res = await sendPortalInvite(baseParams);
      assert.equal(res.success, false);
      assert.match(res.error ?? '', /400/);
    }
  );
});
