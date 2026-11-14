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
      { cwd: creappPath, timeout: timeoutMs },
      (err) => resolve(!err),
    );
  });
}

export function createRealProbes({
  supabaseUrl,
  r2Url,
  creappPath,
  gitRemote = 'origin',
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  return {
    supabase: httpProbe(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/`, timeoutMs),
    r2: httpProbe(r2Url, timeoutMs),
    git: gitProbe({ creappPath, gitRemote, timeoutMs }),
  };
}
