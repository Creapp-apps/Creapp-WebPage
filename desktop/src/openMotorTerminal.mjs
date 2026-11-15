import { spawn as realSpawn } from 'node:child_process';

// Abre Terminal.app en el directorio del motor (donde vive el .mcp.json, que Claude
// Code lee al arrancar) y, si se pasa un comando, lanza la IA directo (0 enters).
//
// Solo macOS (usa osascript). Resiliente: nunca tira; devuelve { ok, error? }.

// Comillas simples para shell POSIX: envuelve y escapa las comillas simples internas.
export function shq(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

// Comillas dobles para un string de AppleScript: escapa backslash y comilla doble.
export function asq(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Saca saltos de línea (evita inyectar líneas extra al do script / shell).
function oneLine(s) {
  return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim();
}

// Arma los args de osascript (-e <script>). motorPath va con comillas de shell
// (tiene espacios); command se concatena tras `&&` si viene no vacío.
export function buildOsascriptArgs(motorPath, command) {
  const dir = oneLine(motorPath);
  const cmd = oneLine(command);
  const shellCmd = cmd ? `cd ${shq(dir)} && ${cmd}` : `cd ${shq(dir)}`;
  const script = `tell application "Terminal"\nactivate\ndo script ${asq(shellCmd)}\nend tell`;
  return ['-e', script];
}

export function openMotorTerminal(config, command, opts = {}) {
  const { spawn = realSpawn, platform = process.platform } = opts;
  const motorPath = config && config.motorPath;
  if (!motorPath) return { ok: false, error: 'no_motor_path' };
  if (platform !== 'darwin') {
    return { ok: false, error: `plataforma no soportada: ${platform} (solo macOS)` };
  }
  try {
    const proc = spawn('osascript', buildOsascriptArgs(motorPath, command), {
      stdio: 'ignore',
      detached: true,
    });
    if (proc && typeof proc.unref === 'function') proc.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
