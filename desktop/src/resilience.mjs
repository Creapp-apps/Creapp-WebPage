// Wrapper de resiliencia: ejecuta una operación asíncrona y detecta tanto
// fallas (rechazo) como intermitencia (no completar dentro de `timeoutMs`).
//
// Contrato:
// - La Promise devuelta resuelve con el valor del primer intento exitoso
//   (el original o un retry). Nunca rechaza.
// - Ante una falla (rechazo o timeout) se emite UNA vez por intento:
//   `onEvent({ type: 'failed', label, error, retry })`. `error` es el motivo del
//   rechazo, o un Error con `kind: 'timeout'` si venció `timeoutMs`.
// - `retry()` re-ejecuta `op` y devuelve, como la Promise original, el resultado
//   del nuevo intento. Si ese intento vuelve a fallar se emite otro `failed`.
// - Si nadie llama a `retry()`, la Promise queda pendiente: la decisión de
//   reintentar es del caller (la UI la muestra, el usuario decide).
// - `onEvent({ type: 'success' })` se emite una sola vez, al resolver.
// - Sin `timeoutMs` finito no hay timer. Los timers se limpian al resolver o fallar.
// - Un intento que resuelve tarde (después de un timeout) sí puede resolver la
//   Promise si aún no hubo éxito; los éxitos posteriores se ignoran.

export function runWithRetry(op, { label = 'op', onEvent = () => {}, timeoutMs } = {}) {
  return new Promise((resolve) => {
    let done = false;

    const attempt = () => {
      let attemptOver = false;
      let timer = null;

      const onOk = (value) => {
        clearTimeout(timer);
        if (done) return;
        done = true;
        resolve(value);
        onEvent({ type: 'success' });
      };

      const onFail = (error) => {
        clearTimeout(timer);
        if (done || attemptOver) return;
        attemptOver = true;
        onEvent({ type: 'failed', label, error, retry: attempt });
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
