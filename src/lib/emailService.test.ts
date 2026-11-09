import test from 'node:test';
import assert from 'node:assert/strict';
import { sendPortalInvite } from './emailService.ts';

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
