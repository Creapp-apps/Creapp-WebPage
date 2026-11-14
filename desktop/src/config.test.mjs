import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig, loadConfig } from './config.mjs';

const roots = [];
const tmpHome = () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'creapp-cfg-'));
  roots.push(home);
  return home;
};
const cfgFile = (home) => path.join(home, '.creapp-desktop', 'config.json');
const writeCfg = (home, content) => {
  fs.mkdirSync(path.dirname(cfgFile(home)), { recursive: true });
  fs.writeFileSync(cfgFile(home), content);
};

after(() => {
  for (const home of roots) fs.rmSync(home, { recursive: true, force: true });
});

test('falta el archivo: lo crea con defaults y devuelve defaults', () => {
  const home = tmpHome();
  const cfg = loadConfig({ home, fs });
  assert.deepEqual(cfg, defaultConfig({ home }));
  assert.ok(fs.existsSync(cfgFile(home)), 'debe crear el archivo');
  const onDisk = JSON.parse(fs.readFileSync(cfgFile(home), 'utf8'));
  assert.equal(onDisk.motorPort, 8000);
  assert.equal(onDisk.uiPort, 4599);
});

test('JSON corrupto: devuelve defaults sin tirar y no sobreescribe el archivo', () => {
  const home = tmpHome();
  const corrupt = '{ no es json';
  writeCfg(home, corrupt);
  let cfg;
  assert.doesNotThrow(() => { cfg = loadConfig({ home, fs }); });
  assert.deepEqual(cfg, defaultConfig({ home }));
  assert.equal(fs.readFileSync(cfgFile(home), 'utf8'), corrupt);
});

test('override parcial: mergea sobre defaults', () => {
  const home = tmpHome();
  writeCfg(home, JSON.stringify({ motorPort: 8100 }));
  const cfg = loadConfig({ home, fs });
  assert.equal(cfg.motorPort, 8100);
  assert.equal(cfg.uiPort, 4599);
  assert.equal(cfg.creappPath, '/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub');
  assert.equal(cfg.motorPath, path.join(home, 'Desktop/PROYECTOS DEV/Creador de Contenidos'));
});

test('expande ~ en los paths (default y override)', () => {
  const home = tmpHome();
  writeCfg(home, JSON.stringify({ creappPath: '~/repos/creapp' }));
  const cfg = loadConfig({ home, fs });
  assert.equal(cfg.creappPath, path.join(home, 'repos/creapp'));
  assert.ok(!cfg.motorPath.includes('~'));
  assert.ok(!cfg.creappPath.includes('~'));
});

test('valor null en motorPath: devuelve defaults sin tirar', () => {
  const home = tmpHome();
  writeCfg(home, JSON.stringify({ motorPath: null }));
  let cfg;
  assert.doesNotThrow(() => { cfg = loadConfig({ home, fs }); });
  assert.deepEqual(cfg, defaultConfig({ home }));
});

test('valor de tipo inválido en creappPath: devuelve defaults sin tirar', () => {
  const home = tmpHome();
  writeCfg(home, JSON.stringify({ creappPath: 5 }));
  let cfg;
  assert.doesNotThrow(() => { cfg = loadConfig({ home, fs }); });
  assert.deepEqual(cfg, defaultConfig({ home }));
});

test('tipo inválido en un campo no rompe los válidos del mismo archivo', () => {
  const home = tmpHome();
  writeCfg(home, JSON.stringify({ motorPort: '8100', uiPort: 4700 }));
  const cfg = loadConfig({ home, fs });
  assert.equal(cfg.motorPort, 8000);
  assert.equal(cfg.uiPort, 4700);
});
