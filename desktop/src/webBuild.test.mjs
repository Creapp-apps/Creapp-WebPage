import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { buildWebUi } from './webBuild.mjs';

const config = { creappPath: '/web' };

function fakeProc() {
  const p = new EventEmitter();
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  p.killed = [];
  p.kill = (sig) => { p.killed.push(sig); return true; };
  return p;
}

test('spawnea `npm run build` en creappPath con PATH de Homebrew', async () => {
  const proc = fakeProc();
  let spawned;
  const spawn = (cmd, args, opts) => { spawned = { cmd, args, opts }; return proc; };
  const p = buildWebUi(config, { spawn, env: { PATH: '/bin' } });
  setImmediate(() => proc.emit('exit', 0));
  const res = await p;
  assert.deepEqual(res, { ok: true });
  assert.equal(spawned.cmd, 'npm');
  assert.deepEqual(spawned.args, ['run', 'build']);
  assert.equal(spawned.opts.cwd, '/web');
  assert.match(spawned.opts.env.PATH, /homebrew.*\/bin/);
});

test('exit != 0 -> ok:false con la cola del stderr (nunca tira)', async () => {
  const proc = fakeProc();
  const p = buildWebUi(config, { spawn: () => proc });
  proc.stderr.emit('data', 'error TS1234: boom\n');
  setImmediate(() => proc.emit('exit', 1));
  const res = await p;
  assert.equal(res.ok, false);
  assert.match(res.error, /código 1/);
  assert.match(res.error, /boom/);
});

test('spawn que tira -> ok:false, no propaga', async () => {
  const spawn = () => { throw new Error('ENOENT npm'); };
  const res = await buildWebUi(config, { spawn });
  assert.equal(res.ok, false);
  assert.match(res.error, /ENOENT npm/);
});

test('proc emite error -> ok:false', async () => {
  const proc = fakeProc();
  const p = buildWebUi(config, { spawn: () => proc });
  setImmediate(() => proc.emit('error', new Error('spawn falló')));
  const res = await p;
  assert.equal(res.ok, false);
  assert.match(res.error, /spawn falló/);
});

test('timeout -> SIGKILL y ok:false, nunca cuelga', async () => {
  const proc = fakeProc();
  const res = await buildWebUi(config, { spawn: () => proc, timeoutMs: 10 });
  assert.equal(res.ok, false);
  assert.match(res.error, /build_timeout/);
  assert.deepEqual(proc.killed, ['SIGKILL']);
});
