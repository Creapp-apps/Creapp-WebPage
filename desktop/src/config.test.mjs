import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig, loadConfig } from './config.mjs';

const tmpHome = () => fs.mkdtempSync(path.join(os.tmpdir(), 'creapp-cfg-'));
const cfgFile = (home) => path.join(home, '.creapp-desktop', 'config.json');

test('falta el archivo: lo crea con defaults y devuelve defaults', () => {
  const home = tmpHome();
  const cfg = loadConfig({ home, fs });
  assert.deepEqual(cfg, defaultConfig({ home }));
  assert.ok(fs.existsSync(cfgFile(home)), 'debe crear el archivo');
  const onDisk = JSON.parse(fs.readFileSync(cfgFile(home), 'utf8'));
  assert.equal(onDisk.motorPort, 8000);
  assert.equal(onDisk.uiPort, 4599);
});

test('JSON corrupto: devuelve defaults sin tirar', () => {
  const home = tmpHome();
  fs.mkdirSync(path.dirname(cfgFile(home)), { recursive: true });
  fs.writeFileSync(cfgFile(home), '{ no es json');
  let cfg;
  assert.doesNotThrow(() => { cfg = loadConfig({ home, fs }); });
  assert.deepEqual(cfg, defaultConfig({ home }));
});

test('override parcial: mergea sobre defaults', () => {
  const home = tmpHome();
  fs.mkdirSync(path.dirname(cfgFile(home)), { recursive: true });
  fs.writeFileSync(cfgFile(home), JSON.stringify({ motorPort: 8100 }));
  const cfg = loadConfig({ home, fs });
  assert.equal(cfg.motorPort, 8100);
  assert.equal(cfg.uiPort, 4599);
  assert.equal(cfg.creappPath, '/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub');
  assert.equal(cfg.motorPath, path.join(home, 'Desktop/PROYECTOS DEV/Creador de Contenidos'));
});

test('expande ~ en los paths (default y override)', () => {
  const home = tmpHome();
  fs.mkdirSync(path.dirname(cfgFile(home)), { recursive: true });
  fs.writeFileSync(cfgFile(home), JSON.stringify({ creappPath: '~/repos/creapp' }));
  const cfg = loadConfig({ home, fs });
  assert.equal(cfg.creappPath, path.join(home, 'repos/creapp'));
  assert.ok(!cfg.motorPath.includes('~'));
  assert.ok(!cfg.creappPath.includes('~'));
});
