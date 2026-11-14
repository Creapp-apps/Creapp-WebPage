import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runWithRetry } from './resilience.mjs';

// Op que devuelve una promesa que el test resuelve/rechaza a mano.
function deferredOp() {
  let resolve;
  let reject;
  const op = () =>
    new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
  return { op, resolve: (v) => resolve(v), reject: (e) => reject(e) };
}

test('op ok al primer intento: emite success, no emite failed, resuelve con el valor', async () => {
  const events = [];
  const result = await runWithRetry(async () => 'listo', {
    label: 'supabase',
    onEvent: (e) => events.push(e),
    timeoutMs: 1000,
  });

  assert.equal(result, 'listo');
  assert.deepEqual(events, [{ type: 'success' }]);
});

test('op rechaza: emite failed con label, error y retry; retry re-ejecuta y puede resolver', async () => {
  const events = [];
  let calls = 0;
  const op = async () => {
    calls += 1;
    if (calls === 1) throw new Error('red caída');
    return 42;
  };

  const pending = runWithRetry(op, {
    label: 'r2',
    onEvent: (e) => events.push(e),
    timeoutMs: 1000,
  });

  // Esperamos a que llegue el evento failed (el op ya rechazó).
  await new Promise((r) => setImmediate(r));
  const failed = events.find((e) => e.type === 'failed');
  assert.ok(failed, 'debe emitir failed');
  assert.equal(failed.label, 'r2');
  assert.equal(failed.error.message, 'red caída');
  assert.equal(typeof failed.retry, 'function');
  assert.equal(calls, 1);

  failed.retry();
  const result = await pending;

  assert.equal(result, 42);
  assert.equal(calls, 2, 'retry debe re-ejecutar op');
  assert.deepEqual(events.at(-1), { type: 'success' });
});

test('retry que vuelve a fallar emite otro failed con un retry nuevo', async () => {
  const events = [];
  let calls = 0;
  const op = async () => {
    calls += 1;
    if (calls < 3) throw new Error(`fallo ${calls}`);
    return 'ok';
  };

  const pending = runWithRetry(op, {
    label: 'git',
    onEvent: (e) => events.push(e),
    timeoutMs: 1000,
  });

  await new Promise((r) => setImmediate(r));
  events.find((e) => e.type === 'failed').retry();
  await new Promise((r) => setImmediate(r));
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 2);
  failures.at(-1).retry();

  assert.equal(await pending, 'ok');
  assert.equal(calls, 3);
});

test('op que nunca resuelve: tras timeoutMs emite failed de intermitencia y permite retry', async () => {
  const events = [];
  const slow = deferredOp();
  let calls = 0;
  const op = () => {
    calls += 1;
    return calls === 1 ? slow.op() : Promise.resolve('rápido');
  };

  const pending = runWithRetry(op, {
    label: 'probe',
    onEvent: (e) => events.push(e),
    timeoutMs: 1,
  });

  // Dejamos vencer el timeout (1 ms) sin esperar nada real más allá de eso.
  await new Promise((r) => setTimeout(r, 5));
  const failed = events.find((e) => e.type === 'failed');
  assert.ok(failed, 'debe emitir failed por timeout');
  assert.equal(failed.label, 'probe');
  assert.equal(failed.error.kind, 'timeout');
  assert.match(failed.error.message, /1 ?ms/);
  assert.equal(typeof failed.retry, 'function');

  failed.retry();
  assert.equal(await pending, 'rápido');
  assert.equal(calls, 2);
});

test('op rechaza antes del timeout: el timer se limpia y no se emite un segundo failed', async () => {
  const events = [];
  const op = async () => {
    throw new Error('boom');
  };

  runWithRetry(op, {
    label: 'x',
    onEvent: (e) => events.push(e),
    timeoutMs: 10,
  });

  await new Promise((r) => setTimeout(r, 25));
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 1, 'un solo failed, sin disparo tardío del timeout');
  assert.equal(failures[0].error.message, 'boom');
});

test('op que resuelve tarde tras un timeout no emite success duplicado si ya hubo retry exitoso', async () => {
  const events = [];
  const late = deferredOp();
  let calls = 0;
  const op = () => {
    calls += 1;
    return calls === 1 ? late.op() : Promise.resolve('segundo');
  };

  const pending = runWithRetry(op, {
    label: 'y',
    onEvent: (e) => events.push(e),
    timeoutMs: 1,
  });

  await new Promise((r) => setTimeout(r, 5));
  events.find((e) => e.type === 'failed').retry();
  assert.equal(await pending, 'segundo');

  late.resolve('tardío');
  await new Promise((r) => setImmediate(r));
  const successes = events.filter((e) => e.type === 'success');
  assert.equal(successes.length, 1);
});
