import { test } from 'node:test';
import assert from 'node:assert';
import { buildInstallTerminalCommand } from './terminalCommand.mjs';
test('incluye el comando escrito (echo) y luego lo corre', () => {
  const out = buildInstallTerminalCommand('ffmpeg en PATH', 'brew install ffmpeg');
  assert.ok(out.includes("echo 'CreAPP va a instalar: ffmpeg en PATH."), 'intro con el label');
  assert.ok(out.includes("echo '> brew install ffmpeg'"), 'echo del comando exacto');
  assert.ok(out.endsWith(' && brew install ffmpeg'), 'corre el comando crudo al final');
});
test('no deja romper comillas dobles del label', () => {
  const out = buildInstallTerminalCommand('a "b" c', 'brew install node');
  assert.ok(out.includes('a "b" c'));
  assert.ok(out.endsWith(' && brew install node'));
});
test('escapa comilla simple del label (anti-inyeccion)', () => {
  const out = buildInstallTerminalCommand("Tim's venv", 'python3 -m venv .venv');
  assert.ok(out.includes("Tim'\\''s venv"), 'comilla simple escapada como \'\\\'\'');
  assert.ok(!out.includes("Tim's venv"), 'sin comilla cruda');
  assert.ok(out.includes("echo '> python3 -m venv .venv'"));
  assert.ok(out.endsWith(' && python3 -m venv .venv'));
});
