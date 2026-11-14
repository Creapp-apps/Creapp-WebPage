import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startMotor, stopMotor } from './motor.mjs';

const config = { motorPath: '/m', motorPort: 8123 };

function fakeProc({ exitOnKill = true } = {}) {
  const p = new EventEmitter();
  p.stdout = new EventEmitter();
  p.stderr = new EventEmitter();
  p.killed = [];
  p.kill = (sig) => {
    p.killed.push(sig);
    if (exitOnKill) setImmediate(() => p.emit('exit', null, sig));
    return true;
  };
  return p;
}
const okFetch = (okAt) => {
  let n = 0;
  const f = async () => { n++; if (n < okAt) throw new Error('ECONNREFUSED'); return { status: 200 }; };
  f.calls = () => n;
  return f;
};

test('health 200 on 3rd poll resolves {port} and spawns uvicorn verbatim', async () => {
  const proc = fakeProc();
  let spawned;
  const spawn = (cmd, args, opts) => { spawned = { cmd, args, opts }; return proc; };
  const fetch = okFetch(3);
  const h = await startMotor(config, { spawn, fetch, timeoutMs: 1000, pollMs: 1 });
  assert.equal(h.port, 8123);
  assert.equal(h.proc, proc);
  assert.equal(fetch.calls(), 3);
  assert.equal(spawned.cmd, '/m/.venv/bin/uvicorn');
  assert.deepEqual(spawned.args, ['src.web.app:app', '--port', '8123']);
  assert.equal(spawned.opts.cwd, '/m');
});

test('never healthy -> motor_timeout and process is killed', async () => {
  const proc = fakeProc();
  const fetch = async () => { throw new Error('down'); };
  await assert.rejects(
    startMotor(config, { spawn: () => proc, fetch, timeoutMs: 30, pollMs: 1 }),
    (e) => e.message === 'motor_timeout',
  );
  assert.deepEqual(proc.killed, ['SIGTERM']);
});

test('exit before health -> motor_exit with code', async () => {
  const proc = fakeProc();
  const fetch = async () => { throw new Error('down'); };
  const p = startMotor(config, { spawn: () => proc, fetch, timeoutMs: 1000, pollMs: 1 });
  setImmediate(() => proc.emit('exit', 3, null));
  await assert.rejects(p, (e) => e.message === 'motor_exit' && e.code === 3);
});

test('onLog receives stdout and stderr', async () => {
  const proc = fakeProc();
  const h = await startMotor(config, { spawn: () => proc, fetch: okFetch(1), timeoutMs: 1000, pollMs: 1 });
  const got = [];
  h.onLog((s) => got.push(s));
  proc.stdout.emit('data', Buffer.from('out'));
  proc.stderr.emit('data', Buffer.from('err'));
  assert.deepEqual(got, ['out', 'err']);
});

test('stopMotor sends SIGTERM and resolves on exit; idempotent after exit', async () => {
  const proc = fakeProc();
  const h = await startMotor(config, { spawn: () => proc, fetch: okFetch(1), timeoutMs: 1000, pollMs: 1 });
  await stopMotor(h);
  assert.deepEqual(proc.killed, ['SIGTERM']);
  await stopMotor(h);
  assert.deepEqual(proc.killed, ['SIGTERM']);
});

test('stopMotor escalates to SIGKILL when SIGTERM is ignored, and resolves', async () => {
  const proc = fakeProc({ exitOnKill: false });
  const h = await startMotor(config, { spawn: () => proc, fetch: okFetch(1), timeoutMs: 1000, pollMs: 1 });
  await stopMotor(h, { killAfterMs: 5, capMs: 5 });
  assert.deepEqual(proc.killed, ['SIGTERM', 'SIGKILL']);
});

test('timeout path escalates to SIGKILL if child ignores SIGTERM', async () => {
  const proc = fakeProc({ exitOnKill: false });
  const fetch = async () => { throw new Error('down'); };
  await assert.rejects(
    startMotor(config, { spawn: () => proc, fetch, timeoutMs: 20, pollMs: 1, killAfterMs: 5, capMs: 5 }),
    (e) => e.message === 'motor_timeout',
  );
  assert.deepEqual(proc.killed, ['SIGTERM', 'SIGKILL']);
});

test('exit after 200 does not re-reject; handle marked exited', async () => {
  const proc = fakeProc();
  const h = await startMotor(config, { spawn: () => proc, fetch: okFetch(1), timeoutMs: 1000, pollMs: 1 });
  proc.emit('exit', 1, null);
  assert.equal(h.exited, true);
  await stopMotor(h);
  assert.deepEqual(proc.killed, []);
});

test('200 after exit does not re-resolve', async () => {
  const proc = fakeProc();
  let release;
  const fetch = () => new Promise((r) => { release = () => r({ status: 200 }); });
  const p = startMotor(config, { spawn: () => proc, fetch, timeoutMs: 1000, pollMs: 1 });
  await new Promise((r) => setImmediate(r));
  proc.emit('exit', 2, null);
  release();
  await assert.rejects(p, (e) => e.message === 'motor_exit' && e.code === 2);
});

test('spawn error event (ENOENT) rejects motor_exit', async () => {
  const proc = fakeProc();
  const fetch = async () => { throw new Error('down'); };
  const p = startMotor(config, { spawn: () => proc, fetch, timeoutMs: 1000, pollMs: 1 });
  setImmediate(() => proc.emit('error', Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' })));
  await assert.rejects(p, (e) => e.message === 'motor_exit' && e.cause.code === 'ENOENT');
});

test('onLog replays lines emitted before registration', async () => {
  const proc = fakeProc();
  const spawn = () => { setImmediate(() => proc.stdout.emit('data', Buffer.from('boot'))); return proc; };
  const h = await startMotor(config, { spawn, fetch: okFetch(3), timeoutMs: 1000, pollMs: 1 });
  const got = [];
  h.onLog((s) => got.push(s));
  assert.deepEqual(got, ['boot']);
});
