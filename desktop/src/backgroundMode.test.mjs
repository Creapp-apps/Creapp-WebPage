import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldQuitOnAllWindowsClosed, shouldHideInsteadOfClose } from './backgroundMode.mjs';

test('macOS no cierra la app al cerrar la ventana (queda en la barra de menú)', () => {
  assert.equal(shouldQuitOnAllWindowsClosed('darwin'), false);
});

test('Windows/Linux sí cierran la app al cerrar todas las ventanas', () => {
  assert.equal(shouldQuitOnAllWindowsClosed('win32'), true);
  assert.equal(shouldQuitOnAllWindowsClosed('linux'), true);
});

test('close oculta la ventana salvo que estemos saliendo de verdad', () => {
  assert.equal(shouldHideInsteadOfClose(false), true);  // cierre normal → ocultar
  assert.equal(shouldHideInsteadOfClose(true), false);  // Salir/Cmd+Q → cerrar de verdad
});
