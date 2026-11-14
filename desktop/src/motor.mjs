import { spawn as realSpawn } from 'node:child_process';
import path from 'node:path';

const LOG_BUFFER_MAX = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startMotor(config, opts = {}) {
  const { spawn = realSpawn, fetch = globalThis.fetch, timeoutMs = 30000, pollMs = 500, killAfterMs = 5000, capMs = 1000 } = opts;
  const { motorPath, motorPort } = config;
  const proc = spawn(
    path.join(motorPath, '.venv', 'bin', 'uvicorn'),
    ['src.web.app:app', '--port', String(motorPort)],
    { cwd: motorPath, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const logCbs = [];
  const logBuf = [];
  const emit = (d) => {
    const s = String(d);
    logBuf.push(s);
    if (logBuf.length > LOG_BUFFER_MAX) logBuf.shift();
    for (const cb of logCbs) cb(s);
  };
  proc.stdout?.on('data', emit);
  proc.stderr?.on('data', emit);

  const handle = {
    proc,
    port: motorPort,
    exited: false,
    // Entrega primero lo emitido antes de registrar el callback (boot temprano).
    onLog: (cb) => { for (const s of logBuf) cb(s); logCbs.push(cb); },
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    const finish = (fn, v) => { if (!settled) { settled = true; fn(v); } };

    proc.on('error', (err) => {
      handle.exited = true;
      finish(reject, Object.assign(new Error('motor_exit'), { code: null, cause: err }));
    });
    proc.on('exit', (code) => {
      handle.exited = true;
      if (!timedOut) finish(reject, Object.assign(new Error('motor_exit'), { code }));
    });

    (async () => {
      const deadline = Date.now() + timeoutMs;
      const url = `http://127.0.0.1:${motorPort}/`;
      while (!settled) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(Math.max(pollMs * 2, 1)) });
          if (res.status === 200) return finish(resolve, handle);
        } catch { /* aún no escucha */ }
        if (settled) return;
        if (Date.now() >= deadline) {
          // Primero decidimos el motivo (si no, el exit provocado ganaría la carrera).
          timedOut = true;
          await stopMotor(handle, { killAfterMs, capMs });
          return finish(reject, new Error('motor_timeout'));
        }
        await sleep(pollMs);
      }
    })();
  });
}

// SIGTERM; si no sale en killAfterMs, SIGKILL; resuelve al exit o tras capMs más (nunca cuelga).
export function stopMotor(handle, { killAfterMs = 5000, capMs = 1000 } = {}) {
  if (!handle || handle.exited) return Promise.resolve();
  return new Promise((resolve) => {
    let t1, t2;
    const done = () => { clearTimeout(t1); clearTimeout(t2); handle.exited = true; resolve(); };
    handle.proc.once('exit', done);
    try { handle.proc.kill('SIGTERM'); } catch { /* ya muerto */ }
    t1 = setTimeout(() => {
      try { handle.proc.kill('SIGKILL'); } catch { /* ya muerto */ }
      t2 = setTimeout(done, capMs);
    }, killAfterMs);
  });
}
