import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMonitor } from './connectivity.mjs';

// Probes controlables: cada una devuelve lo que le digamos en `state`.
function makeProbes(state) {
  return {
    supabase: async () => state.supabase,
    r2: async () => state.r2,
    git: async () => state.git,
  };
}

// Timers falsos: guardamos el callback y lo disparamos a mano (sin reloj real).
function makeTimers() {
  const t = { cb: null, ms: null, cleared: false };
  t.setInterval = (cb, ms) => { t.cb = cb; t.ms = ms; return 1; };
  t.clearInterval = () => { t.cleared = true; };
  return t;
}

function collect(monitor) {
  const events = { change: [], lost: 0 };
  monitor.on('change', (ev) => events.change.push(ev));
  monitor.on('connection-lost', () => { events.lost += 1; });
  return events;
}

test('todas las probes ok -> online true y services todos verdes', async () => {
  const state = { supabase: true, r2: true, git: true };
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000 });
  const events = collect(m);
  const res = await m.checkNow();
  assert.equal(res.online, true);
  assert.deepEqual(res.services, { supabase: true, r2: true, git: true });
  assert.equal(events.change.length, 1);
  assert.deepEqual(events.change[0], { online: true, services: { supabase: true, r2: true, git: true } });
  assert.equal(events.lost, 0);
});

test('una probe falla -> solo esa service en rojo; online sigue la regla supabase && r2', async () => {
  const state = { supabase: true, r2: true, git: false };
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000 });
  const res = await m.checkNow();
  assert.deepEqual(res.services, { supabase: true, r2: true, git: false });
  // git no es requisito: sin git el monitor sigue online.
  assert.equal(res.online, true);

  const state2 = { supabase: false, r2: true, git: true };
  const m2 = createMonitor({ probes: makeProbes(state2), intervalMs: 1000 });
  const res2 = await m2.checkNow();
  assert.deepEqual(res2.services, { supabase: false, r2: true, git: true });
  assert.equal(res2.online, false);
});

test('una probe que rechaza cuenta como caída (no tumba el monitor)', async () => {
  const probes = {
    supabase: async () => { throw new Error('ENOTFOUND'); },
    r2: async () => true,
    git: async () => true,
  };
  const m = createMonitor({ probes, intervalMs: 1000 });
  const res = await m.checkNow();
  assert.equal(res.services.supabase, false);
  assert.equal(res.online, false);
});

test('todas caen tras estar online -> exactamente UN connection-lost', async () => {
  const state = { supabase: true, r2: true, git: true };
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000 });
  const events = collect(m);
  await m.checkNow();
  state.supabase = false; state.r2 = false; state.git = false;
  await m.checkNow();
  await m.checkNow();
  await m.checkNow();
  assert.equal(events.lost, 1);
  const last = events.change.at(-1);
  assert.deepEqual(last, { online: false, services: { supabase: false, r2: false, git: false } });
});

test('recuperación -> change con online true y NINGÚN segundo connection-lost', async () => {
  const state = { supabase: true, r2: true, git: true };
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000 });
  const events = collect(m);
  await m.checkNow();
  state.supabase = false; state.r2 = false;
  await m.checkNow();
  state.supabase = true; state.r2 = true;
  await m.checkNow();
  await m.checkNow();
  assert.equal(events.lost, 1);
  assert.equal(events.change.at(-1).online, true);
  assert.equal(events.change.filter((e) => e.online === true).length, 2);
});

test('arranque ya offline: no emite connection-lost (no hubo transición online->offline)', async () => {
  const state = { supabase: false, r2: false, git: false };
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000 });
  const events = collect(m);
  await m.checkNow();
  await m.checkNow();
  assert.equal(events.lost, 0);
  assert.equal(events.change.length, 1);
  assert.equal(events.change[0].online, false);
});

// Probe spy: cuenta cuántas veces se consultó cada probe (sólo el conteo de checks).
function countingProbes(state) {
  const calls = { n: 0 };
  const base = makeProbes(state);
  const wrap = (fn) => async () => { calls.n += 1; return fn(); };
  return {
    probes: { supabase: wrap(base.supabase), r2: wrap(base.r2), git: wrap(base.git) },
    calls,
  };
}

const flush = () => new Promise((r) => setImmediate(r));

test('start() dispara checks por intervalo y stop() impide que un cb posterior haga checks', async () => {
  const state = { supabase: true, r2: true, git: true };
  const timers = makeTimers();
  const { probes, calls } = countingProbes(state);
  const m = createMonitor({ probes, intervalMs: 5000, timers });
  m.start();
  await flush();
  assert.equal(timers.ms, 5000);
  assert.equal(calls.n, 3, 'start() hace un check inmediato (3 probes)');

  timers.cb(); // el intervalo dispara
  await flush();
  assert.equal(calls.n, 6, 'el intervalo agrega un check (3 probes más)');

  m.stop();
  assert.equal(timers.cleared, true);
  timers.cb(); // cb viejo tras stop()
  await flush();
  assert.equal(calls.n, 6, 'tras stop() el cb no produce checks');
});

test('online->offline->online->offline da DOS connection-lost (el estado se resetea al recuperar)', async () => {
  const state = { supabase: true, r2: true, git: true };
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000 });
  const events = collect(m);
  await m.checkNow();
  state.r2 = false;
  await m.checkNow();
  state.r2 = true;
  await m.checkNow();
  state.supabase = false;
  await m.checkNow();
  assert.equal(events.lost, 2);
});

test('un checkNow lento y viejo no pisa un resultado más nuevo ya aplicado', async () => {
  const state = { supabase: true, r2: true, git: true };
  const gate = {};
  // Primer check (seq 2) queda colgado hasta que lo liberemos; el segundo (seq 3) resuelve ya.
  let slowNext = false;
  const probes = {
    supabase: () => {
      if (!slowNext) return Promise.resolve(state.supabase);
      slowNext = false;
      return new Promise((resolve) => { gate.release = () => resolve(false); });
    },
    r2: async () => state.r2,
    git: async () => state.git,
  };
  const m = createMonitor({ probes, intervalMs: 1000 });
  const events = collect(m);
  await m.checkNow(); // online aplicado
  slowNext = true;
  const slow = m.checkNow(); // viejo: supabase cuelga, luego dará offline
  await m.checkNow(); // nuevo: online, aplicado primero
  gate.release();
  const res = await slow;
  await flush();
  assert.equal(res.stale, true);
  assert.equal(events.lost, 0, 'el batch viejo no emite connection-lost');
  assert.equal(events.change.length, 1, 'no hay change espurio');
});

test('un listener que tira no deja una promesa suelta: se reporta como monitor-error', async () => {
  const state = { supabase: true, r2: true, git: true };
  const timers = makeTimers();
  const m = createMonitor({ probes: makeProbes(state), intervalMs: 1000, timers });
  const errors = [];
  m.on('monitor-error', (err) => errors.push(err));
  m.on('change', () => { throw new Error('listener roto'); });
  m.start();
  await flush();
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, 'listener roto');
});
