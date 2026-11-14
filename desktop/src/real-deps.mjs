import { execFile } from 'node:child_process';
import fs from 'node:fs';

const EXTRA_PATH = '/opt/homebrew/bin:/usr/local/bin';

// Una app empaquetada lanzada desde Finder recibe un PATH mínimo: se antepone Homebrew
// para no dar falsos negativos de ffmpeg/python/node.
export function buildExecEnv(env = process.env) {
  return { ...env, PATH: `${EXTRA_PATH}:${env.PATH ?? ''}` };
}

export function makeRealDeps({ env = process.env, execFileImpl = execFile } = {}) {
  return {
    exec: (file, args = []) =>
      new Promise((resolve, reject) => {
        execFileImpl(file, args, { env: buildExecEnv(env), timeout: 30000 }, (err, stdout, stderr) => {
          if (err) return reject(new Error(String(stderr || err.message).trim() || err.message));
          resolve(String(stdout) + String(stderr || ''));
        });
      }),
    fs: { existsSync: (p) => fs.existsSync(p) },
  };
}
