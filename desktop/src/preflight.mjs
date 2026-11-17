import path from 'node:path';
import { installCommandFor } from './installCommands.mjs';

// Preflight de dependencias del desktop.
// Dependencias inyectadas:
//   exec(file, args) -> Promise<string>  (stdout; rechaza si el comando falla)
//   fs.existsSync(p) -> boolean

const MIN_PYTHON = [3, 9];
const MIN_NODE_MAJOR = 20;

const FIX = {
  paths: 'revisá motorPath y creappPath en ~/.creapp-desktop/config.json',
  python: 'instalá Python 3.9 o superior (brew install python@3.12)',
  venv: 'creá/actualizá el venv del motor: python -m venv .venv && pip install -r requirements.txt',
  ffmpeg: 'brew install ffmpeg',
  ffprobe: 'brew install ffmpeg',
  node: 'instalá Node 20 o superior (brew install node)',
  remotion_modules: 'corré npm install en <motorPath>/src/remotion',
  ui_build: 'corré npm run build en el repo CreAPP',
};

function result(id, label, ok, detail) {
  const { installable, command } = installCommandFor(id);
  return { id, label, ok, detail, fix: ok ? null : FIX[id], install: command, installable };
}

function checkPaths(config, { fs }) {
  const missing = [config.motorPath, config.creappPath].filter((p) => !fs.existsSync(p));
  const ok = missing.length === 0;
  const detail = ok ? 'motor y CreAPP encontrados' : `no existe: ${missing.join(', ')}`;
  return result('paths', 'Rutas del motor y de CreAPP', ok, detail);
}

async function checkPython(_config, { exec }) {
  try {
    const out = await exec('python3', ['--version']);
    const m = /(\d+)\.(\d+)/.exec(out);
    if (!m) return result('python', 'Python 3.9+', false, `versión no reconocida: ${out.trim()}`);
    const [maj, min] = [Number(m[1]), Number(m[2])];
    const ok = maj > MIN_PYTHON[0] || (maj === MIN_PYTHON[0] && min >= MIN_PYTHON[1]);
    return result('python', 'Python 3.9+', ok, `Python ${maj}.${min}`);
  } catch (err) {
    return result('python', 'Python 3.9+', false, `no se pudo ejecutar python3: ${err.message}`);
  }
}

async function checkVenv(config, { exec }) {
  const venvPython = path.join(config.motorPath, '.venv', 'bin', 'python');
  try {
    await exec(venvPython, ['-c', 'import fastapi']);
    return result('venv', 'Venv del motor (fastapi)', true, 'fastapi importa desde .venv');
  } catch (err) {
    return result('venv', 'Venv del motor (fastapi)', false, `no importa fastapi: ${err.message}`);
  }
}

function checkBinary(id, label, bin, { exec }) {
  return exec('which', [bin]).then(
    (out) => result(id, label, true, out.trim()),
    (err) => result(id, label, false, `${bin} no está en PATH: ${err.message}`),
  );
}

async function checkNode(_config, { exec }) {
  try {
    const out = await exec('node', ['--version']);
    const major = Number(/v?(\d+)/.exec(out)?.[1]);
    const ok = Number.isFinite(major) && major >= MIN_NODE_MAJOR;
    return result('node', `Node ${MIN_NODE_MAJOR}+`, ok, out.trim());
  } catch (err) {
    return result('node', `Node ${MIN_NODE_MAJOR}+`, false, `no se pudo ejecutar node: ${err.message}`);
  }
}

function checkRemotion(config, { fs }) {
  const dir = path.join(config.motorPath, 'src', 'remotion', 'node_modules');
  const ok = fs.existsSync(dir);
  return result('remotion_modules', 'Módulos de Remotion', ok, ok ? 'node_modules presente' : `no existe: ${dir}`);
}

function checkUiBuild(config, { fs }) {
  const index = path.join(config.creappPath, 'dist', 'index.html');
  const ok = fs.existsSync(index);
  return result('ui_build', 'Build de la UI de CreAPP', ok, ok ? 'dist/index.html presente' : `no existe: ${index}`);
}

// Un check nunca debe tirar: cualquier error inesperado queda como check fallido.
async function safely(id, label, fn, config, deps) {
  try {
    return await fn(config, deps);
  } catch (err) {
    return result(id, label, false, `error inesperado: ${err.message}`);
  }
}

export async function runPreflight(config, deps) {
  const checks = await Promise.all([
    safely('paths', 'Rutas del motor y de CreAPP', checkPaths, config, deps),
    safely('python', 'Python 3.9+', checkPython, config, deps),
    safely('venv', 'Venv del motor (fastapi)', checkVenv, config, deps),
    safely('ffmpeg', 'ffmpeg en PATH', (c, d) => checkBinary('ffmpeg', 'ffmpeg en PATH', 'ffmpeg', d), config, deps),
    safely('ffprobe', 'ffprobe en PATH', (c, d) => checkBinary('ffprobe', 'ffprobe en PATH', 'ffprobe', d), config, deps),
    safely('node', `Node ${MIN_NODE_MAJOR}+`, checkNode, config, deps),
    safely('remotion_modules', 'Módulos de Remotion', checkRemotion, config, deps),
    safely('ui_build', 'Build de la UI de CreAPP', checkUiBuild, config, deps),
  ]);
  return { ok: checks.every((c) => c.ok), checks };
}
