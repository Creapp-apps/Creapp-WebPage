import test from 'node:test';
import assert from 'node:assert/strict';
import { shq, asq, buildOsascriptArgs, openMotorTerminal } from './openMotorTerminal.mjs';

test('shq envuelve y escapa comillas simples', () => {
  assert.equal(shq('/a/b'), `'/a/b'`);
  assert.equal(shq("a'b"), `'a'\\''b'`);
});

test('asq escapa backslash y comilla doble', () => {
  assert.equal(asq('x"y'), '"x\\"y"');
  assert.equal(asq('a\\b'), '"a\\\\b"');
});

test('buildOsascriptArgs: path con espacios va con comillas y lanza el comando', () => {
  const [flag, script] = buildOsascriptArgs('/Users/x/PROYECTOS DEV/Creador de Contenidos', 'claude');
  assert.equal(flag, '-e');
  assert.match(script, /do script "cd '\/Users\/x\/PROYECTOS DEV\/Creador de Contenidos' && claude"/);
  assert.match(script, /tell application "Terminal"/);
});

test('buildOsascriptArgs: sin comando solo hace cd', () => {
  const [, script] = buildOsascriptArgs('/repo', '');
  assert.match(script, /do script "cd '\/repo'"/);
  assert.doesNotMatch(script, /&&/);
});

test('buildOsascriptArgs: saltos de línea en el comando se neutralizan', () => {
  const [, script] = buildOsascriptArgs('/repo', 'claude\nrm -rf /');
  // el \n se colapsa a espacio; no hay segunda línea de do script inyectada
  assert.equal((script.match(/do script/g) || []).length, 1);
});

test('openMotorTerminal: spawnea osascript en darwin', () => {
  let spawned;
  const spawn = (cmd, args) => { spawned = { cmd, args }; return { unref() {} }; };
  const res = openMotorTerminal({ motorPath: '/repo' }, 'claude', { spawn, platform: 'darwin' });
  assert.deepEqual(res, { ok: true });
  assert.equal(spawned.cmd, 'osascript');
  assert.equal(spawned.args[0], '-e');
});

test('openMotorTerminal: fuera de macOS devuelve error sin spawnear', () => {
  let llamado = false;
  const spawn = () => { llamado = true; return {}; };
  const res = openMotorTerminal({ motorPath: '/repo' }, 'claude', { spawn, platform: 'linux' });
  assert.equal(res.ok, false);
  assert.match(res.error, /solo macOS/);
  assert.equal(llamado, false);
});

test('openMotorTerminal: sin motorPath devuelve error', () => {
  const res = openMotorTerminal({}, 'claude', { spawn: () => ({}), platform: 'darwin' });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'no_motor_path');
});

test('openMotorTerminal: spawn que tira no propaga', () => {
  const spawn = () => { throw new Error('ENOENT osascript'); };
  const res = openMotorTerminal({ motorPath: '/repo' }, 'claude', { spawn, platform: 'darwin' });
  assert.equal(res.ok, false);
  assert.match(res.error, /ENOENT/);
});
