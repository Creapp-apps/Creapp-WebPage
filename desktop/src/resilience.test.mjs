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

// Deja correr las microtareas y los callbacks de promesa pendientes (setImmediate no está mockeado).
const flush = () => new Promise((r) => setImmediate(r));

// Registra unhandledRejection durante el test.
function trackUnhandled(t) {
  const seen = [];
  const handler = (err) => seen.push(err);
  process.on('unhandledRejection', handler);
  t.after(() => process.off('unhandledRejection', handler));
  return seen;
}

test('op ok al primer intento: emite success una vez, no emite failed, resuelve con el valor', async () => {
  const events = [];
  const result = await runWithRetry(async () => 'listo', {
    label: 'supabase',
    onEvent: (e) => events.push(e),
    timeoutMs: 1000,
  });

  assert.equal(result, 'listo');
  assert.deepEqual(events, [{ type: 'success' }]);
});

test('op rechaza: emite failed (exactamente 1) con label, error y retry; retry re-ejecuta y resuelve', async () => {
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

  await flush();
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 1, 'exactamente un failed');
  const failed = failures[0];
  assert.equal(failed.label, 'r2');
  assert.equal(failed.error.message, 'red caída');
  assert.equal(typeof failed.retry, 'function');
  assert.equal(calls, 1);

  failed.retry();
  assert.equal(await pending, 42);
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

  await flush();
  events.find((e) => e.type === 'failed').retry();
  await flush();
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 2);
  failures.at(-1).retry();

  assert.equal(await pending, 'ok');
  assert.equal(calls, 3);
});

test('op que nunca resuelve: tras timeoutMs emite failed de intermitencia y permite retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
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
    timeoutMs: 1000,
  });

  t.mock.timers.tick(1000);
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 1, 'exactamente un failed por timeout');
  const failed = failures[0];
  assert.equal(failed.label, 'probe');
  assert.equal(failed.error.kind, 'timeout');
  assert.equal(failed.error.message, 'timeout tras 1000 ms');
  assert.equal(typeof failed.retry, 'function');

  failed.retry();
  assert.equal(await pending, 'rápido');
  assert.equal(calls, 2);
});

test('op rechaza antes del timeout: se limpia el timer y no hay segundo failed', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const setSpy = t.mock.method(globalThis, 'setTimeout');
  const clearSpy = t.mock.method(globalThis, 'clearTimeout');
  const events = [];
  const op = async () => {
    throw new Error('boom');
  };

  runWithRetry(op, {
    label: 'x',
    onEvent: (e) => events.push(e),
    timeoutMs: 10,
  });

  await flush();
  const timerId = setSpy.mock.calls[0].result;
  assert.ok(
    clearSpy.mock.calls.some((c) => c.arguments[0] === timerId),
    'el timer del intento debe limpiarse al rechazar',
  );

  t.mock.timers.tick(100);
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 1, 'un solo failed, sin disparo tardío del timeout');
  assert.equal(failures[0].error.message, 'boom');
});

test('op que rechaza DESPUÉS del timeout no emite un segundo failed', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const events = [];
  const late = deferredOp();

  runWithRetry(late.op, {
    label: 'race',
    onEvent: (e) => events.push(e),
    timeoutMs: 5,
  });

  t.mock.timers.tick(5);
  assert.equal(events.filter((e) => e.type === 'failed').length, 1);

  late.reject(new Error('tardío'));
  await flush();
  const failures = events.filter((e) => e.type === 'failed');
  assert.equal(failures.length, 1, 'el rechazo tardío no emite un segundo failed');
  assert.equal(failures[0].error.kind, 'timeout', 'el failed entregado es el del timeout');
});

test('op que resuelve tarde tras un timeout no emite success duplicado si ya hubo retry exitoso', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
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

  t.mock.timers.tick(1);
  events.find((e) => e.type === 'failed').retry();
  assert.equal(await pending, 'segundo');

  late.resolve('tardío');
  await flush();
  assert.equal(events.filter((e) => e.type === 'success').length, 1);
});

test('dos retry() sobre el mismo failed arrancan un solo intento', async () => {
  const events = [];
  let calls = 0;
  const op = async () => {
    calls += 1;
    if (calls === 1) throw new Error('primero');
    return 'ok';
  };

  const pending = runWithRetry(op, { label: 'dup', onEvent: (e) => events.push(e) });
  await flush();
  const failed = events.find((e) => e.type === 'failed');
  failed.retry();
  failed.retry();
  assert.equal(await pending, 'ok');
  await flush();
  assert.equal(calls, 2, 'solo un intento extra, no dos');
});

test('retry() llamado después de un éxito es no-op: no vuelve a ejecutar op', async () => {
  const events = [];
  let calls = 0;
  const op = async () => {
    calls += 1;
    if (calls === 1) throw new Error('primero');
    return 'ok';
  };

  const pending = runWithRetry(op, { label: 'stale', onEvent: (e) => events.push(e) });
  await flush();
  const failed = events.find((e) => e.type === 'failed');
  failed.retry();
  assert.equal(await pending, 'ok');

  failed.retry();
  await flush();
  assert.equal(calls, 2, 'un retry stale no ejecuta op otra vez');
});

test('onEvent que lanza en failed: no hay unhandled rejection, el failed se entregó y el retry sigue sirviendo', async (t) => {
  const unhandled = trackUnhandled(t);
  const logged = t.mock.method(console, 'error', () => {});
  const delivered = [];
  let calls = 0;
  const op = async () => {
    calls += 1;
    if (calls === 1) throw new Error('falla');
    return 'recuperado';
  };

  const pending = runWithRetry(op, {
    label: 'ui',
    onEvent: (e) => {
      delivered.push(e);
      if (e.type === 'failed') throw new Error('listener roto');
    },
  });

  await flush();
  const failed = delivered.find((e) => e.type === 'failed');
  assert.ok(failed, 'el failed se entregó aunque el listener tire');
  failed.retry();
  assert.equal(await pending, 'recuperado');
  await flush();
  assert.equal(unhandled.length, 0, 'sin unhandled rejection');
  assert.equal(logged.mock.callCount(), 1, 'el error del listener se loguea');
});

test('onEvent que lanza en success: la Promise igual resuelve y no hay unhandled rejection', async (t) => {
  const unhandled = trackUnhandled(t);
  t.mock.method(console, 'error', () => {});
  const result = await runWithRetry(async () => 'valor', {
    label: 'ok',
    onEvent: (e) => {
      if (e.type === 'success') throw new Error('listener roto');
    },
  });
  await flush();
  assert.equal(result, 'valor');
  assert.equal(unhandled.length, 0, 'sin unhandled rejection');
});
