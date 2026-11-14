import { execFile } from 'node:child_process';

// Probes reales para createMonitor. Dependencias: sólo Node built-ins.
// Cada probe resuelve true/false; nunca rechaza (el monitor igual lo trata como caída).
//
//   supabaseUrl  -> base del proyecto (ej. VITE_SUPABASE_URL de la UI); se pega a /rest/v1/
//   r2Url        -> dominio público de R2 (assets)
//   creappPath   -> repo CreAPP, desde donde se corre git ls-remote
//   gitRemote    -> remoto a consultar (default 'origin')

const DEFAULT_TIMEOUT_MS = 5000;

function httpProbe(url, timeoutMs) {
  return async () => {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs) });
      return res.status < 500; // cualquier respuesta del servidor cuenta como alcanzable
    } catch {
      return false;
    }
  };
}

function gitProbe({ creappPath, gitRemote, timeoutMs }) {
  return () => new Promise((resolve) => {
    execFile(
      'git',
      ['ls-remote', '--exit-code', gitRemote, 'HEAD'],
      // GIT_TERMINAL_PROMPT=0: sin prompt de credenciales, falla rápido en vez de colgarse.
      { cwd: creappPath, timeout: timeoutMs, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } },
      (err) => resolve(!err),
    );
  });
}

function requireString(name, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`createRealProbes: falta ${name} (string no vacío)`);
  }
}

function requireHttpsUrl(name, value) {
  requireString(name, value);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`createRealProbes: ${name} no es una URL válida: ${value}`);
  }
  if (url.protocol !== 'https:') {
    throw new TypeError(`createRealProbes: ${name} debe ser https (recibido ${url.protocol})`);
  }
}

export function createRealProbes({
  supabaseUrl,
  r2Url,
  creappPath,
  gitRemote = 'origin',
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  requireHttpsUrl('supabaseUrl', supabaseUrl);
  requireHttpsUrl('r2Url', r2Url);
  requireString('creappPath', creappPath);
  return {
    supabase: httpProbe(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`, timeoutMs),
    r2: httpProbe(r2Url, timeoutMs),
    git: gitProbe({ creappPath, gitRemote, timeoutMs }),
  };
}
