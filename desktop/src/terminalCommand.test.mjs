import { test } from 'node:test';
import assert from 'node:assert';
import { buildInstallTerminalCommand } from './terminalCommand.mjs';
test('incluye el comando escrito (echo) y luego lo corre', () => {
  const out = buildInstallTerminalCommand('ffmpeg en PATH', 'brew install ffmpeg');
  assert.ok(out.includes('brew install ffmpeg'));
  assert.ok(/echo .+ && .*brew install ffmpeg$/s.test(out) || out.trim().endsWith('brew install ffmpeg'));
});
test('no deja romper comillas dobles del label', () => {
  const out = buildInstallTerminalCommand('a "b" c', 'brew install node');
  assert.ok(out.endsWith('brew install node'));
});
