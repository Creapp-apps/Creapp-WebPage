// Wrapper de resiliencia: ejecuta una operación asíncrona y detecta tanto
// fallas (rechazo) como intermitencia (no completar dentro de `timeoutMs`).
//
// Contrato:
// - La Promise devuelta resuelve con el valor del primer intento exitoso
//   (el original o un retry). Nunca rechaza.
// - Ante una falla (rechazo o timeout) se emite UNA vez por intento:
//   `onEvent({ type: 'failed', label, error, retry })`. `error` es el motivo del
//   rechazo, o un Error con `kind: 'timeout'` si venció `timeoutMs`.
// - `retry()` re-ejecuta `op` y devuelve undefined: el resultado llega por la
//   Promise externa (la que devolvió runWithRetry). Cada `failed` admite un solo
//   `retry()`; llamadas extra, o después de un éxito, son no-op.
//   Si el nuevo intento vuelve a fallar se emite otro `failed` con su propio retry.
// - Si nadie llama a `retry()`, la Promise queda pendiente: la decisión de
//   reintentar es del caller (la UI la muestra, el usuario decide).
// - `onEvent({ type: 'success' })` se emite una sola vez, al resolver.
// - Un `onEvent` que lanza no rompe el wrapper: el error se loguea con console.error
//   y la Promise externa igual settlea. Nunca hay unhandled rejection por eventos.
// - Sin `timeoutMs` finito no hay timer. Los timers se limpian al resolver o fallar.
// - Un intento que resuelve tarde (después de un timeout) sí puede resolver la
//   Promise si aún no hubo éxito; los éxitos posteriores se ignoran. Un intento que
//   rechaza tarde no emite un segundo `failed`.

export function runWithRetry(op, { label = 'op', onEvent = () => {}, timeoutMs } = {}) {
  return new Promise((resolve) => {
    let done = false;

    const emit = (evt) => {
      try {
        onEvent(evt);
      } catch (err) {
        console.error(err);
      }
    };

    const attempt = () => {
      let attemptOver = false;
      let timer = null;

      const onOk = (value) => {
        clearTimeout(timer);
        if (done) return;
        done = true;
        resolve(value);
        emit({ type: 'success' });
      };

      const onFail = (error) => {
        clearTimeout(timer);
        if (done || attemptOver) return;
        attemptOver = true;
        let consumed = false;
        emit({
          type: 'failed',
          label,
          error,
          retry: () => {
            if (consumed || done) return;
            consumed = true;
            attempt();
          },
        });
      };

      if (Number.isFinite(timeoutMs)) {
        timer = setTimeout(() => {
          onFail(Object.assign(new Error(`timeout tras ${timeoutMs} ms`), { kind: 'timeout' }));
        }, timeoutMs);
      }

      let pending;
      try {
        pending = Promise.resolve(op());
      } catch (err) {
        pending = Promise.reject(err);
      }
      pending.then(onOk, onFail);
    };

    attempt();
  });
}
