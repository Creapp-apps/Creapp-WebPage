import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExecEnv, makeRealDeps } from './real-deps.mjs';

test('buildExecEnv antepone homebrew al PATH', () => {
  const env = buildExecEnv({ PATH: '/usr/bin', X: '1' });
  assert.equal(env.PATH, '/opt/homebrew/bin:/usr/local/bin:/usr/bin');
  assert.equal(env.X, '1');
});

test('exec pasa el env con PATH extendido a execFile', async () => {
  let seen;
  const deps = makeRealDeps({
    env: { PATH: '/usr/bin' },
    execFileImpl: (f, a, o, cb) => { seen = { f, a, o }; cb(null, 'v20', ''); },
  });
  assert.equal((await deps.exec('node', ['--version'])).trim(), 'v20');
  assert.ok(seen.o.env.PATH.startsWith('/opt/homebrew/bin:/usr/local/bin:'));
});

test('exec rechaza si el comando falla', async () => {
  const deps = makeRealDeps({ execFileImpl: (f, a, o, cb) => cb(new Error('boom'), '', 'no está') });
  await assert.rejects(deps.exec('x'), /no está/);
});
