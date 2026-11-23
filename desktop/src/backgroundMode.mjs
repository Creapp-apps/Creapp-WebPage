// Modo "barra de menú": la suite queda viva en segundo plano cuando se cierra la
// ventana, para seguir corriendo la agencia (motor) y disparando notificaciones del
// sistema. Solo se cierra de verdad desde el Tray (Salir) o Cmd+Q.

/**
 * Al cerrar la última ventana, ¿la app debe salir?
 * En macOS NO: queda en la barra de menú (patrón de app de menu bar). En Windows/Linux sí.
 */
export function shouldQuitOnAllWindowsClosed(platform) {
  return platform !== 'darwin';
}

/**
 * Al recibir el evento 'close' de la ventana, ¿ocultarla en vez de destruirla?
 * Sí mientras no estemos saliendo de verdad (isQuitting). Cuando el usuario elige
 * "Salir" / Cmd+Q, isQuitting pasa a true y la ventana se cierra normalmente.
 */
export function shouldHideInsteadOfClose(isQuitting) {
  return !isQuitting;
}

/**
 * Al pedir salir de verdad (Dock → Salir, Tray → Salir, Cmd+Q), ¿hay que mostrar antes
 * el modal de confirmación en la UI en vez de cerrar directo?
 * Sí solo si: todavía no se confirmó, hay una ventana viva y el overlay está inyectado
 * (tiene dónde mostrarse). Si el overlay no está listo (ej. aún en el preflight), se deja
 * salir sin modal para no dejar la app imposible de cerrar.
 */
export function shouldConfirmBeforeQuit({ quitConfirmed, overlayReady, hasWindow }) {
  return !quitConfirmed && !!hasWindow && !!overlayReady;
}
