import realFs from 'node:fs';

// Comilla simple segura para el shell (zsh/bash): envuelve en '...' y escapa las ' internas.
function shQuote(p) {
  return "'" + String(p).replace(/'/g, "'\\''") + "'";
}

/**
 * Comando para auto-lanzar Claude en la terminal embebida.
 *
 * La terminal corre con cwd en el repo del motor; con --add-dir le sumamos los repos
 * extra que existan en disco (p. ej. el repo del portal/desktop) para que Claude pueda
 * grepear y leer ambos proyectos sin fusionar repos. Los paths que no existan se omiten
 * (nunca rompe: en el peor caso lanza `claude` pelado, como antes).
 */
export function buildClaudeLaunch(extraDirs = [], { fs = realFs } = {}) {
  const dirs = (Array.isArray(extraDirs) ? extraDirs : [])
    .filter((d) => typeof d === 'string' && d.trim() !== '')
    .filter((d) => { try { return fs.existsSync(d); } catch { return false; } });
  const flags = dirs.map((d) => `--add-dir ${shQuote(d)}`).join(' ');
  return `claude${flags ? ' ' + flags : ''}\n`;
}
