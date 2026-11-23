import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldQuitOnAllWindowsClosed, shouldHideInsteadOfClose, shouldConfirmBeforeQuit } from './backgroundMode.mjs';

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

test('pide confirmación de salida solo si no se confirmó, hay ventana y overlay listo', () => {
  // Caso típico: Dock → Salir con la UI cargada → mostrar modal.
  assert.equal(shouldConfirmBeforeQuit({ quitConfirmed: false, overlayReady: true, hasWindow: true }), true);
  // Ya confirmado (el usuario apretó "Sí, cerrar") → salir sin volver a preguntar.
  assert.equal(shouldConfirmBeforeQuit({ quitConfirmed: true, overlayReady: true, hasWindow: true }), false);
  // Overlay no inyectado (ej. todavía en el preflight) → no hay dónde mostrar el modal → salir.
  assert.equal(shouldConfirmBeforeQuit({ quitConfirmed: false, overlayReady: false, hasWindow: true }), false);
  // Sin ventana viva → salir.
  assert.equal(shouldConfirmBeforeQuit({ quitConfirmed: false, overlayReady: true, hasWindow: false }), false);
});
