import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildClaudeLaunch } from './claudeLaunch.mjs';

// fs falso: solo "existen" los paths listados.
const fakeFs = (existing) => ({ existsSync: (p) => existing.includes(p) });

test('sin dirs extra: lanza claude pelado', () => {
  assert.equal(buildClaudeLaunch([], { fs: fakeFs([]) }), 'claude\n');
  assert.equal(buildClaudeLaunch(undefined, { fs: fakeFs([]) }), 'claude\n');
});

test('un dir que existe: lo suma con --add-dir quoteado', () => {
  const fs = fakeFs(['/repo/portal']);
  assert.equal(buildClaudeLaunch(['/repo/portal'], { fs }), "claude --add-dir '/repo/portal'\n");
});

test('omite los dirs que no existen en disco', () => {
  const fs = fakeFs(['/repo/portal']);
  assert.equal(buildClaudeLaunch(['/repo/portal', '/no/existe'], { fs }), "claude --add-dir '/repo/portal'\n");
  assert.equal(buildClaudeLaunch(['/no/existe'], { fs }), 'claude\n');
});

test('varios dirs existentes: varios --add-dir', () => {
  const fs = fakeFs(['/a', '/b']);
  assert.equal(buildClaudeLaunch(['/a', '/b'], { fs }), "claude --add-dir '/a' --add-dir '/b'\n");
});

test('paths con espacios quedan quoteados', () => {
  const p = '/Users/x/Desktop/CREAPP/creapp hub';
  const fs = fakeFs([p]);
  assert.equal(buildClaudeLaunch([p], { fs }), "claude --add-dir '/Users/x/Desktop/CREAPP/creapp hub'\n");
});

test('ignora valores no-string o vacíos', () => {
  const fs = fakeFs(['/a']);
  assert.equal(buildClaudeLaunch(['/a', '', null, 42], { fs }), "claude --add-dir '/a'\n");
});
