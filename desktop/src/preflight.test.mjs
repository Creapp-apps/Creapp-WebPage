import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPreflight } from './preflight.mjs';

const CFG = { motorPath: '/motor', creappPath: '/creapp', motorPort: 8000, uiPort: 4599 };
const PY = '/motor/.venv/bin/python';
const EXPECTED_IDS = ['paths', 'python', 'venv', 'ffmpeg', 'ffprobe', 'node', 'remotion_modules', 'ui_build'];

const ALL_PATHS = ['/motor', '/creapp', '/motor/src/remotion/node_modules', '/creapp/dist/index.html'];
const GOOD_CMDS = {
  'python3 --version': 'Python 3.12.1\n',
  [`${PY} -c import fastapi`]: '',
  'which ffmpeg': '/opt/homebrew/bin/ffmpeg\n',
  'which ffprobe': '/opt/homebrew/bin/ffprobe\n',
  'node --version': 'v22.1.0\n',
};

// Mock de exec: cada comando conocido devuelve stdout o rechaza (si el valor es Error).
// Un comando sin mock lanza error, así ningún subproceso real corre en los tests.
function makeDeps({ present = ALL_PATHS, cmds = {} } = {}) {
  const table = { ...GOOD_CMDS, ...cmds };
  const exec = async (file, args = []) => {
    const key = [file, ...args].join(' ');
    if (!(key in table)) throw new Error(`sin mock para: ${key}`);
    const value = table[key];
    if (value instanceof Error) throw value;
    return value;
  };
  const fs = { existsSync: (p) => present.includes(p) };
  return { exec, fs };
}

const fail = () => new Error('command not found');

async function run(over = {}) {
  const res = await runPreflight(CFG, makeDeps(over));
  const get = (id) => res.checks.find((c) => c.id === id);
  return { res, get };
}

test('todos los checks presentes, en orden, y todo en verde => ok global true', async () => {
  const { res } = await run();
  assert.deepEqual(res.checks.map((c) => c.id), EXPECTED_IDS);
  assert.equal(res.ok, true);
  for (const c of res.checks) {
    assert.equal(c.ok, true, `${c.id} debería pasar`);
    assert.equal(typeof c.label, 'string');
    assert.ok(c.label.length > 0);
    assert.equal(typeof c.detail, 'string');
    assert.equal(c.fix, null, `${c.id} pasa, no necesita fix`);
  }
});

test('paths: falla si falta motorPath o creappPath, con fix', async () => {
  const { get, res } = await run({ present: ['/motor'] });
  const c = get('paths');
  assert.equal(c.ok, false);
  assert.match(c.detail, /\/creapp/);
  assert.ok(c.fix && c.fix.length > 0);
  assert.equal(res.ok, false);
});

test('python: 3.9+ pasa; 3.8 falla con fix', async () => {
  const okRun = await run({ cmds: { 'python3 --version': 'Python 3.9.6\n' } });
  assert.equal(okRun.get('python').ok, true);

  const { get } = await run({ cmds: { 'python3 --version': 'Python 3.8.10\n' } });
  const c = get('python');
  assert.equal(c.ok, false);
  assert.match(c.detail, /3\.8/);
  assert.ok(c.fix && c.fix.length > 0);
});

test('python: si el comando no existe, falla con fix', async () => {
  const { get } = await run({ cmds: { 'python3 --version': fail() } });
  const c = get('python');
  assert.equal(c.ok, false);
  assert.ok(c.fix && c.fix.length > 0);
});

test('venv: pasa si fastapi importa desde el venv del motor; falla con fix si no', async () => {
  const { get: getOk } = await run();
  assert.equal(getOk('venv').ok, true);

  const { get } = await run({ cmds: { [`${PY} -c import fastapi`]: fail() } });
  const c = get('venv');
  assert.equal(c.ok, false);
  assert.match(c.fix, /python -m venv \.venv/);
  assert.match(c.fix, /requirements\.txt/);
});

test('ffmpeg: pasa si está en PATH; falla con fix brew', async () => {
  const { get: getOk } = await run();
  assert.equal(getOk('ffmpeg').ok, true);

  const { get } = await run({ cmds: { 'which ffmpeg': fail() } });
  const c = get('ffmpeg');
  assert.equal(c.ok, false);
  assert.equal(c.fix, 'brew install ffmpeg');
});

test('ffprobe: pasa si está en PATH; falla con fix brew', async () => {
  const { get: getOk } = await run();
  assert.equal(getOk('ffprobe').ok, true);

  const { get } = await run({ cmds: { 'which ffprobe': fail() } });
  const c = get('ffprobe');
  assert.equal(c.ok, false);
  assert.equal(c.fix, 'brew install ffmpeg');
});

test('node: 20+ pasa; versión menor falla con fix', async () => {
  const { get: getOk } = await run();
  assert.equal(getOk('node').ok, true);

  const { get } = await run({ cmds: { 'node --version': 'v18.19.0\n' } });
  const c = get('node');
  assert.equal(c.ok, false);
  assert.match(c.detail, /18/);
  assert.ok(c.fix && c.fix.length > 0);
});

test('node: si el comando no existe, falla con fix', async () => {
  const { get } = await run({ cmds: { 'node --version': fail() } });
  const c = get('node');
  assert.equal(c.ok, false);
  assert.ok(c.fix && c.fix.length > 0);
});

test('remotion_modules: pasa si existe node_modules de Remotion; falla con fix', async () => {
  const { get: getOk } = await run();
  assert.equal(getOk('remotion_modules').ok, true);

  const present = ALL_PATHS.filter((p) => p !== '/motor/src/remotion/node_modules');
  const { get } = await run({ present });
  const c = get('remotion_modules');
  assert.equal(c.ok, false);
  assert.ok(c.fix && c.fix.length > 0);
});

test('ui_build: pasa si existe dist/index.html; falla con fix npm run build', async () => {
  const { get: getOk } = await run();
  assert.equal(getOk('ui_build').ok, true);

  const present = ALL_PATHS.filter((p) => p !== '/creapp/dist/index.html');
  const { get } = await run({ present });
  const c = get('ui_build');
  assert.equal(c.ok, false);
  assert.equal(c.fix, 'corré npm run build en el repo CreAPP');
});

test('checks traen install/installable según el mapa de instalación', async () => {
  const { get } = await run({ present: ['/motor'], cmds: { 'which ffmpeg': fail() } });
  const ff = get('ffmpeg');
  assert.equal(ff.ok, false);
  assert.equal(ff.install, 'brew install ffmpeg');
  assert.equal(ff.installable, true);
  const p = get('paths');
  assert.equal(p.install, null);
  assert.equal(p.installable, false);
});

test('ok global es el AND: un solo check en rojo => ok false', async () => {
  const { res } = await run({ cmds: { 'which ffmpeg': fail() } });
  assert.equal(res.ok, false);
  assert.equal(res.checks.filter((c) => !c.ok).length, 1);
});

test('exec que rechaza nunca hace caer runPreflight: lo reporta como check fallido', async () => {
  const cmds = {};
  for (const k of Object.keys(GOOD_CMDS)) cmds[k] = fail();
  const { res } = await run({ present: [], cmds });
  assert.equal(res.ok, false);
  assert.equal(res.checks.length, EXPECTED_IDS.length);
  for (const c of res.checks) assert.equal(c.ok, false, `${c.id} debería fallar`);
});

test('cada check fallido trae fix no vacío en español; los que pasan no', async () => {
  const cmds = {};
  for (const k of Object.keys(GOOD_CMDS)) cmds[k] = fail();
  const { res } = await run({ present: [], cmds });
  for (const c of res.checks) {
    assert.equal(c.ok, false);
    assert.equal(typeof c.fix, 'string', `${c.id} necesita fix`);
    assert.ok(c.fix.trim().length > 0, `${c.id} fix vacío`);
  }

  const green = await run();
  for (const c of green.res.checks) assert.equal(c.fix, null);
});
