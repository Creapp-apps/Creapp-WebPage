import realFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAW_DEFAULTS = {
  motorPath: '~/Desktop/PROYECTOS DEV/Creador de Contenidos',
  creappPath: '/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub',
  motorPort: 8000,
  uiPort: 4599,
};

const KEYS = Object.keys(RAW_DEFAULTS);

function expandHome(p, home) {
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p;
}

function expandConfig(raw, home) {
  return {
    ...raw,
    motorPath: expandHome(raw.motorPath, home),
    creappPath: expandHome(raw.creappPath, home),
  };
}

export function defaultConfig({ home = os.homedir() } = {}) {
  return expandConfig(RAW_DEFAULTS, home);
}

export function loadConfig({ home = os.homedir(), fs = realFs } = {}) {
  const dir = path.join(home, '.creapp-desktop');
  const file = path.join(dir, 'config.json');

  if (!fs.existsSync(file)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(RAW_DEFAULTS, null, 2) + '\n');
    } catch {
      // Sin permisos de escritura: seguimos con defaults en memoria.
    }
    return defaultConfig({ home });
  }

  let overrides = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && typeof parsed === 'object') {
      for (const key of KEYS) {
        const value = parsed[key];
        // Solo aceptamos el valor si su tipo coincide con el default (y los paths son strings no vacíos).
        if (typeof value !== typeof RAW_DEFAULTS[key]) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        overrides[key] = value;
      }
    }
  } catch {
    // JSON corrupto: usamos defaults sin tirar y sin tocar el archivo.
    overrides = {};
  }

  return expandConfig({ ...RAW_DEFAULTS, ...overrides }, home);
}
