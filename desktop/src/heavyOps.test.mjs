import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { gitPush, gitPull, observeMotorUpload } from './heavyOps.mjs';
import { runWithRetry } from './resilience.mjs';

const cfg = { motorPath: '/m', creappPath: '/c', motorPort: 8123, uiPort: 1 };

function fakeSpawn(codes, calls = []) {
  return (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    const p = new EventEmitter();
    p.stderr = new EventEmitter();
    const code = codes.shift();
    setImmediate(() => {
      if (code !== 0) p.stderr.emit('data', Buffer.from('boom'));
      p.emit('close', code);
    });
    return p;
  };
}

test('gitPush ok runs git push in creappPath', async () => {
  const calls = [];
  await gitPush(cfg, { spawn: fakeSpawn([0], calls) });
  assert.equal(calls[0].cmd, 'git');
  assert.deepEqual(calls[0].args, ['push']);
  assert.equal(calls[0].opts.cwd, '/c');
});

test('gitPull exit!=0 rejects with stderr and code', async () => {
  await assert.rejects(gitPull(cfg, { spawn: fakeSpawn([1]) }), /boom.*1|1.*boom/s);
});

test('spawn error event rejects', async () => {
  const spawn = () => { const p = new EventEmitter(); p.stderr = new EventEmitter(); setImmediate(() => p.emit('error', new Error('ENOENT'))); return p; };
  await assert.rejects(gitPush(cfg, { spawn }), /ENOENT/);
});

test('gitPush failure under runWithRetry emits failed and retry succeeds', async () => {
  const codes = [1, 0];
  const events = [];
  const done = runWithRetry(() => gitPush(cfg, { spawn: fakeSpawn(codes) }), {
    label: 'push',
    onEvent: (e) => { events.push(e); if (e.type === 'failed') e.retry(); },
  });
  await done;
  assert.deepEqual(events.map((e) => e.type), ['failed', 'success']);
});

const mkFetch = (bodies, urls = []) => async (url) => {
  urls.push(url);
  const b = bodies.length > 1 ? bodies.shift() : bodies[0];
  return { ok: true, json: async () => b };
};

test('observeMotorUpload ok=true resolves', async () => {
  const urls = [];
  const r = await observeMotorUpload(cfg, 'j1', { fetch: mkFetch([{ ok: true }], urls), sleep: async () => {} });
  assert.equal(r.ok, true);
  assert.equal(urls[0], 'http://127.0.0.1:8123/api/collab/upload-status/j1');
});

test('observeMotorUpload ok=false rejects with error', async () => {
  await assert.rejects(
    observeMotorUpload(cfg, 'j1', { fetch: mkFetch([{ ok: false, error: 'r2 down' }]), sleep: async () => {} }),
    /r2 down/,
  );
});

test('observeMotorUpload polls through null then ok', async () => {
  const urls = [];
  await observeMotorUpload(cfg, 'j1', { fetch: mkFetch([{ ok: null }, { ok: null }, { ok: true }], urls), sleep: async () => {} });
  assert.equal(urls.length, 3);
});

test('observeMotorUpload gives up after maxPolls', async () => {
  await assert.rejects(
    observeMotorUpload(cfg, 'j1', { fetch: mkFetch([{ ok: null }]), sleep: async () => {}, maxPolls: 3 }),
    /timeout/i,
  );
});

test('observeMotorUpload encodes jobId', async () => {
  const urls = [];
  await observeMotorUpload(cfg, 'a/b', { fetch: mkFetch([{ ok: true }], urls), sleep: async () => {} });
  assert.ok(urls[0].endsWith('/a%2Fb'));
});

test('gitPull usa --no-edit --ff-only; runGit sin prompt, stdin ignorado y stdout drenado', async () => {
  const calls = [];
  let stdoutListeners = 0;
  const spawn = (cmd, args, opts) => {
    calls.push({ args, opts });
    const p = new EventEmitter();
    p.stdout = new EventEmitter();
    p.stdout.on('data', () => {});
    p.stderr = new EventEmitter();
    setImmediate(() => { stdoutListeners = p.stdout.listenerCount('data'); p.emit('close', 0); });
    return p;
  };
  await gitPull(cfg, { spawn });
  assert.deepEqual(calls[0].args, ['pull', '--no-edit', '--ff-only']);
  assert.equal(calls[0].opts.env.GIT_TERMINAL_PROMPT, '0');
  assert.deepEqual(calls[0].opts.stdio, ['ignore', 'pipe', 'pipe']);
  // runGit registró su propio listener de stdout (además del nuestro).
  assert.equal(stdoutListeners, 2);
});
