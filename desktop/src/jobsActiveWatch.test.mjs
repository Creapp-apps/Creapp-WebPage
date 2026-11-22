import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motorStatusFrom, startJobsActiveWatch, applyMotorStatus, IDLE } from './jobsActiveWatch.mjs';

const flush = () => new Promise((r) => setImmediate(r));

test('motorStatusFrom: array vacío => idle', () => {
  const s = motorStatusFrom([]);
  assert.equal(s.active, false);
  assert.equal(s.count, 0);
  assert.equal(s.chipText, '');
  assert.equal(s.windowTitle, 'CreAPP Suite');
  assert.equal(s.trayTitle, '');
});

test('motorStatusFrom: una pieza => chip + título + tray', () => {
  const s = motorStatusFrom([
    { display_name: 'Cardoso · reel 02', current_step_label: 'Generando voz…' },
  ]);
  assert.equal(s.active, true);
  assert.equal(s.count, 1);
  assert.equal(s.chipText, 'Motor · Cardoso · reel 02 · Generando voz…');
  assert.equal(s.windowTitle, 'Generando voz… — CreAPP Suite');
  assert.ok(s.trayTitle.startsWith('● '));
  assert.ok(s.trayTitle.length <= 30);
});

test('motorStatusFrom: N>1 => "N piezas"', () => {
  const s = motorStatusFrom([{}, {}, {}]);
  assert.equal(s.count, 3);
  assert.equal(s.active, true);
  assert.equal(s.chipText, 'Motor · 3 piezas');
  assert.equal(s.windowTitle, 'Renderizando 3 piezas — CreAPP Suite');
  assert.equal(s.trayTitle, '● 3 piezas');
});

test('motorStatusFrom: null / campos faltantes => sin throw, defaults', () => {
  assert.doesNotThrow(() => motorStatusFrom(null));
  assert.equal(motorStatusFrom(null).active, false);
  const s = motorStatusFrom([{ job_id: 'x-reel-01' }]);
  assert.equal(s.active, true);
  assert.ok(s.chipText.includes('x-reel-01')); // display fallback al job_id
});

test('motorStatusFrom: trayTitle de label largo se recorta a <=30', () => {
  const s = motorStatusFrom([
    { display_name: 'Cliente', current_step_label: 'Cosechando B-roll cinematográfico de alta gama' },
  ]);
  assert.ok(s.trayTitle.length <= 30);
  assert.ok(s.trayTitle.startsWith('● '));
});

test('startJobsActiveWatch: fetch ok => onStatus con estado reducido (tick inmediato)', async () => {
  const seen = [];
  const fakeTimers = { setInterval: () => 1, clearInterval: () => {} };
  startJobsActiveWatch({
    motorPort: 8000,
    fetchJson: async () => [{ display_name: 'C · reel 01', current_step_label: 'Rendereando…' }],
    timers: fakeTimers,
    onStatus: (s) => seen.push(s),
  });
  await flush();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].active, true);
  assert.equal(seen[0].chipText, 'Motor · C · reel 01 · Rendereando…');
});

test('startJobsActiveWatch: fetch lanza => onStatus idle (error tragado)', async () => {
  const seen = [];
  const fakeTimers = { setInterval: () => 1, clearInterval: () => {} };
  startJobsActiveWatch({
    fetchJson: async () => { throw new Error('motor caído'); },
    timers: fakeTimers,
    onStatus: (s) => seen.push(s),
  });
  await flush();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].active, false);
  assert.equal(seen[0].windowTitle, 'CreAPP Suite');
});

test('startJobsActiveWatch: stop() limpia el interval', () => {
  let cleared = null;
  const fakeTimers = { setInterval: () => 42, clearInterval: (id) => { cleared = id; } };
  const stop = startJobsActiveWatch({
    fetchJson: async () => [],
    timers: fakeTimers,
    onStatus: () => {},
  });
  stop();
  assert.equal(cleared, 42);
});

test('IDLE exportado == estado idle del reducer', () => {
  assert.deepEqual(motorStatusFrom([]), IDLE);
  assert.equal(IDLE.windowTitle, 'CreAPP Suite');
  assert.equal(IDLE.active, false);
});

test('startJobsActiveWatch: no apila ticks mientras uno está en vuelo', async () => {
  let calls = 0;
  let resolveFetch = null;
  let intervalFn = null;
  const fakeTimers = { setInterval: (fn) => { intervalFn = fn; return 7; }, clearInterval: () => {} };
  startJobsActiveWatch({
    fetchJson: () => { calls++; return new Promise((r) => { resolveFetch = r; }); },
    timers: fakeTimers,
    onStatus: () => {},
  });
  await flush();                 // tick inmediato: fetch #1 en vuelo
  assert.equal(calls, 1);
  intervalFn();                  // otro tick mientras #1 sigue en vuelo
  await flush();
  assert.equal(calls, 1);        // no se re-llamó: hay uno en vuelo
  resolveFetch([]);              // #1 resuelve
  await flush();
  intervalFn();                  // ahora sí procede el próximo
  await flush();
  assert.equal(calls, 2);
});

test('applyMotorStatus: activo => send + setTitle + setTray con el label', () => {
  const calls = { send: [], title: [], tray: [] };
  const s = motorStatusFrom([{ display_name: 'C', current_step_label: 'Rendereando…' }]);
  applyMotorStatus(s, {
    send: (ch, p) => calls.send.push([ch, p]),
    setTitle: (t) => calls.title.push(t),
    setTray: (title, tip) => calls.tray.push([title, tip]),
  });
  assert.deepEqual(calls.send[0], ['desktop:motor-status', s]);
  assert.equal(calls.title[0], s.windowTitle);
  assert.deepEqual(calls.tray[0], [s.trayTitle, s.trayTitle]);
});

test('applyMotorStatus: idle => tray vacío y tooltip "CreAPP Suite"', () => {
  const calls = { tray: [] };
  applyMotorStatus(motorStatusFrom([]), {
    send: () => {},
    setTitle: () => {},
    setTray: (title, tip) => calls.tray.push([title, tip]),
  });
  assert.deepEqual(calls.tray[0], ['', 'CreAPP Suite']);
});

test('applyMotorStatus: un efecto que lanza no corta los demás (best-effort)', () => {
  let titled = false;
  assert.doesNotThrow(() => applyMotorStatus(motorStatusFrom([]), {
    send: () => { throw new Error('send roto'); },
    setTitle: () => { titled = true; },
    setTray: () => {},
  }));
  assert.equal(titled, true);
});
