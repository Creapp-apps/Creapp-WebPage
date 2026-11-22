// Terminal embebido: el main de Electron spawnea un PTY (node-pty) que corre el shell
// del usuario en la carpeta del motor y auto-lanza `claude`. El renderer lo muestra con
// xterm vía IPC. `buildPtyConfig` es puro y testeable; `createPtyTerminal` importa node-pty
// de forma perezosa (si no está instalado/no carga, el caller degrada sin romper la suite).

export function buildPtyConfig(cwd, env) {
  const e = env || process.env;
  const shell = e.SHELL || process.env.SHELL || '/bin/zsh';
  return {
    shell,
    args: ['-il'], // login + interactivo (carga el PATH del usuario, con `claude`)
    options: { name: 'xterm-color', cwd, env: e, cols: 80, rows: 24 },
  };
}

// Arranca el PTY. `onData(data)` recibe la salida; `onExit({exitCode})` el cierre.
// Devuelve { write, resize, dispose }. Lanza si node-pty no carga (el caller lo captura).
export async function createPtyTerminal({ cwd, env, onData, onExit, autoLaunch = 'claude\n' }) {
  const pty = await import('node-pty');
  const cfg = buildPtyConfig(cwd, env);
  const p = pty.spawn(cfg.shell, cfg.args, cfg.options);
  if (onData) p.onData((d) => onData(d));
  if (onExit) p.onExit((e) => onExit(e));
  if (autoLaunch) {
    try { p.write(autoLaunch); } catch { /* no bloquea el arranque del PTY */ }
  }
  return {
    write: (d) => { try { p.write(d); } catch { /* ignore */ } },
    resize: (cols, rows) => { try { p.resize(cols, rows); } catch { /* ignore */ } },
    dispose: () => { try { p.kill(); } catch { /* ignore */ } },
  };
}
