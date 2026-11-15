import { spawn as realSpawn } from 'node:child_process';
import { buildExecEnv } from './real-deps.mjs';

// Rebuild de la UI web (vite) antes de servir el dist, para que lo que sirve la suite
// no quede viejo respecto al código (el dist es un build estático en creappPath/dist).
//
// Resiliente por diseño: NUNCA cuelga (timeout -> SIGKILL) y NUNCA tira. Resuelve
// { ok, error? }; el caller decide seguir sirviendo el dist previo si ok es false.
//
// buildExecEnv antepone Homebrew al PATH: una app lanzada desde Finder recibe un PATH
// mínimo y npm/node pueden no estar visibles sin eso.
export function buildWebUi(config, opts = {}) {
  const { spawn = realSpawn, timeoutMs = 180000, env = process.env } = opts;
  const { creappPath } = config;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };

    let proc;
    try {
      proc = spawn('npm', ['run', 'build'], {
        cwd: creappPath,
        env: buildExecEnv(env),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      return finish({ ok: false, error: err.message });
    }

    // Guardamos la cola del stderr para el log de diagnóstico (sin reventar memoria).
    let errTail = '';
    const keep = (d) => { errTail = (errTail + d).slice(-4000); };
    proc.stdout?.on('data', keep);
    proc.stderr?.on('data', keep);

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* ya muerto */ }
      finish({ ok: false, error: `build_timeout tras ${timeoutMs}ms` });
    }, timeoutMs);

    proc.on('error', (err) => {
      clearTimeout(timer);
      finish({ ok: false, error: err.message });
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) return finish({ ok: true });
      finish({ ok: false, error: `build salió con código ${code}: ${errTail.trim().slice(-500)}` });
    });
  });
}
