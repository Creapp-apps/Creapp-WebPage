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

const REQUIRED = ['supabase', 'r2'];

export function createMonitor({ probes, intervalMs = 30_000, timers = globalThis } = {}) {
  const emitter = new EventEmitter();
  const names = Object.keys(probes);
  let lastOnline = null; // null = aún no medido
  let handle = null;

  async function runProbe(name) {
    try {
      return (await probes[name]()) === true;
    } catch {
      return false; // una probe que rechaza es una caída, no un error del monitor
    }
  }

  async function checkNow() {
    const results = await Promise.all(names.map(runProbe));
    const services = Object.fromEntries(names.map((n, i) => [n, results[i]]));
    const online = REQUIRED.every((n) => services[n] === true);

    const wasOnline = lastOnline;
    lastOnline = online;
    if (wasOnline !== online) {
      emitter.emit('change', { online, services });
      if (wasOnline === true && online === false) {
        emitter.emit('connection-lost');
      }
    }
    return { online, services };
  }

  function start() {
    if (handle !== null) return;
    handle = timers.setInterval(() => { checkNow(); }, intervalMs);
    checkNow();
  }

  function stop() {
    if (handle === null) return;
    timers.clearInterval(handle);
    handle = null;
  }

  return Object.assign(emitter, { checkNow, start, stop });
}
