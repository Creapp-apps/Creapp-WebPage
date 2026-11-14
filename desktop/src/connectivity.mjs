import { EventEmitter } from 'node:events';

// Monitor de conectividad del desktop. Puro: las probes y los timers se inyectan.
//
// Regla de `online`: el sistema está online cuando las probes de servicios
// NECESARIOS responden. Requeridos: supabase y r2 (sin ellos el motor no puede
// leer/escribir datos ni assets). git es informativo: se reporta en `services`
// pero su caída NO marca offline (el push/pull se reintenta más tarde).
//
// Eventos:
//   'change'          ({ online, services }) cada vez que `online` cambia
//                     (incluye la primera medición).
//   'connection-lost' sólo en la transición online -> offline. Nunca se repite
//                     mientras sigue offline, y la recuperación no lo emite.
//   'monitor-error'   (err) un listener que tira o un check fallido no se pierde
//                     en una promesa suelta; se reporta por el emitter.
//
// Concurrencia: cada checkNow() toma un número de secuencia. Un resultado más
// viejo que el último ya aplicado se descarta (no pisa estado ni emite eventos),
// así un batch lento no produce change/connection-lost espurios.

const REQUIRED = ['supabase', 'r2'];

export function createMonitor({ probes, intervalMs = 30_000, timers = globalThis } = {}) {
  const emitter = new EventEmitter();
  const names = Object.keys(probes);
  let lastOnline = null; // null = aún no medido
  let issued = 0; // secuencia del último checkNow lanzado
  let applied = 0; // secuencia del último resultado aplicado al estado
  let running = false;
  let handle = null;

  async function runProbe(name) {
    try {
      return (await probes[name]()) === true;
    } catch {
      return false; // una probe que rechaza es una caída, no un error del monitor
    }
  }

  async function checkNow() {
    const seq = ++issued;
    const results = await Promise.all(names.map(runProbe));
    const services = Object.fromEntries(names.map((n, i) => [n, results[i]]));
    const online = REQUIRED.every((n) => services[n] === true);

    if (seq < applied) return { online, services, stale: true }; // resultado viejo: descartado
    applied = seq;

    const wasOnline = lastOnline;
    lastOnline = online;
    if (wasOnline !== online) {
      emitter.emit('change', { online, services });
      if (wasOnline === true && online === false) {
        emitter.emit('connection-lost');
      }
    }
    return { online, services, stale: false };
  }

  // Dispara un check sin soltar la promesa: un error (p. ej. un listener que tira)
  // se reporta como 'monitor-error'.
  function tick() {
    checkNow().catch((err) => emitter.emit('monitor-error', err));
  }

  function start() {
    if (running) return;
    running = true;
    handle = timers.setInterval(() => {
      if (running) tick(); // un cb viejo tras stop() no produce checks
    }, intervalMs);
    tick();
  }

  function stop() {
    if (!running) return;
    running = false;
    timers.clearInterval(handle);
    handle = null;
  }

  return Object.assign(emitter, { checkNow, start, stop });
}
