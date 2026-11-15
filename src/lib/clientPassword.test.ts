import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateStrongPassword, SAFE_ALPHABET } from './clientPassword.ts';

test('longitud por defecto 14', () => {
  assert.equal(generateStrongPassword().length, 14);
});

test('respeta longitud pedida', () => {
  assert.equal(generateStrongPassword(20).length, 20);
});

test('solo usa el alfabeto seguro (sin caracteres ambiguos)', () => {
  for (let i = 0; i < 200; i++) {
    for (const ch of generateStrongPassword()) {
      assert.ok(SAFE_ALPHABET.includes(ch), `char inesperado: ${ch}`);
    }
  }
});

test('incluye al menos una minúscula, una mayúscula y un dígito', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateStrongPassword();
    assert.match(p, /[a-z]/, 'falta minúscula');
    assert.match(p, /[A-Z]/, 'falta mayúscula');
    assert.match(p, /[0-9]/, 'falta dígito');
  }
});

test('dos llamadas no coinciden', () => {
  assert.notEqual(generateStrongPassword(), generateStrongPassword());
});

test('rechaza longitudes menores a 12', () => {
  assert.throws(() => generateStrongPassword(11));
});
