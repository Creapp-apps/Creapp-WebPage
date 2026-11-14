import { spawn as realSpawn } from 'node:child_process';

function runGit(args, cwd, spawn) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const p = spawn('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Drenar stdout: si nadie lo lee, un resumen grande llena el pipe (64KB) y git se cuelga.
    p.stdout?.on('data', () => {});
    p.stderr?.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`git ${args.join(' ')} falló (exit ${code}): ${stderr.trim()}`));
    });
  });
}

export const gitPush = (config, { spawn = realSpawn } = {}) => runGit(['push'], config.creappPath, spawn);
export const gitPull = (config, { spawn = realSpawn } = {}) => runGit(['pull', '--no-edit', '--ff-only'], config.creappPath, spawn);

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pollea el status de subida del motor hasta ok=true (resuelve) u ok=false (rechaza).
// ok=null = nada registrado aún: sigue hasta maxPolls y rechaza por timeout.
export async function observeMotorUpload(
  config,
  jobId,
  { fetch: doFetch = globalThis.fetch, sleep = realSleep, intervalMs = 1000, maxPolls = 120 } = {},
) {
  const url = `http://127.0.0.1:${config.motorPort}/api/collab/upload-status/${encodeURIComponent(jobId)}`;
  for (let i = 0; i < maxPolls; i++) {
    const res = await doFetch(url);
    if (!res.ok) throw new Error(`status endpoint HTTP ${res.status}`);
    const body = await res.json();
    if (body.ok === true) return body;
    if (body.ok === false) throw new Error(body.error || 'subida falló');
    if (i < maxPolls - 1) await sleep(intervalMs);
  }
  throw new Error(`timeout esperando subida de ${jobId}`);
}
