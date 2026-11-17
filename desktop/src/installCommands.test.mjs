import { test } from 'node:test';
import assert from 'node:assert';
import { installCommandFor } from './installCommands.mjs';
test('brew para ffmpeg/ffprobe/node/python', () => {
  assert.equal(installCommandFor('ffmpeg').command, 'brew install ffmpeg');
  assert.equal(installCommandFor('ffprobe').command, 'brew install ffmpeg');
  assert.equal(installCommandFor('node').command, 'brew install node');
  assert.equal(installCommandFor('python').command, 'brew install python@3.12');
});
test('venv y remotion con contexto', () => {
  assert.strictEqual(installCommandFor('venv').command, 'python3 -m venv .venv && .venv/bin/pip install -r requirements.txt');
  assert.equal(installCommandFor('remotion_modules').command, 'cd src/remotion && npm install');
});
test('paths/ui_build/desconocido no instalables', () => {
  for (const id of ['paths', 'ui_build', 'otro']) {
    const r = installCommandFor(id);
    assert.equal(r.installable, false);
    assert.equal(r.command, null);
  }
});
