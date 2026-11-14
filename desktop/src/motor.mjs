import { spawn as realSpawn } from 'node:child_process';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startMotor(config, opts = {}) {
  const { spawn = realSpawn, fetch = globalThis.fetch, timeoutMs = 30000, pollMs = 500 } = opts;
  const { motorPath, motorPort } = config;
  const proc = spawn(
    path.join(motorPath, '.venv', 'bin', 'uvicorn'),
    ['src.web.app:app', '--port', String(motorPort)],
    { cwd: motorPath, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const logCbs = [];
  const emit = (d) => { const s = String(d); for (const cb of logCbs) cb(s); };
  proc.stdout?.on('data', emit);
  proc.stderr?.on('data', emit);

  const handle = {
    proc,
    port: motorPort,
    exited: false,
    onLog: (cb) => { logCbs.push(cb); },
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, v) => { if (!settled) { settled = true; fn(v); } };

    proc.on('error', (err) => {
      handle.exited = true;
      finish(reject, Object.assign(new Error('motor_exit'), { code: null, cause: err }));
    });
    proc.on('exit', (code) => {
      handle.exited = true;
      finish(reject, Object.assign(new Error('motor_exit'), { code }));
    });

    (async () => {
      const deadline = Date.now() + timeoutMs;
      const url = `http://127.0.0.1:${motorPort}/`;
      while (!settled) {
        try {
          const res = await fetch(url);
          if (res.status === 200) return finish(resolve, handle);
        } catch { /* aún no escucha */ }
        if (settled) return;
        if (Date.now() >= deadline) {
          try { proc.kill('SIGTERM'); } catch { /* ya muerto */ }
          return finish(reject, new Error('motor_timeout'));
        }
        await sleep(pollMs);
      }
    })();
  });
}

export function stopMotor(handle) {
  if (!handle || handle.exited) return Promise.resolve();
  return new Promise((resolve) => {
    handle.proc.once('exit', () => { handle.exited = true; resolve(); });
    handle.proc.kill('SIGTERM');
  });
}
