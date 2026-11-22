import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPtyConfig } from './ptyTerminal.mjs';

test('buildPtyConfig: shell login, cwd, env y nombre de terminal', () => {
  const c = buildPtyConfig('/x', { PATH: '/bin' });
  assert.ok(c.shell && c.shell.length > 0, 'shell no vacío');
  assert.ok(c.args.some((a) => a === '-il' || a === '-l'), 'login shell flag');
  assert.equal(c.options.cwd, '/x');
  assert.equal(c.options.env.PATH, '/bin');
  assert.equal(c.options.name, 'xterm-color');
});
