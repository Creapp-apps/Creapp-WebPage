import http from 'node:http';

// Watcher del estado en vivo del motor local: qué pieza está procesando.
// Núcleo puro (`motorStatusFrom`) sin efectos; el poll inyecta fetch/timers y
// empuja el estado por `onStatus` para que el main lo mapee a overlay (chip),
// título de ventana y Tray. Espeja el patrón de `preflightWatch.mjs`.

export const IDLE = Object.freeze({
  active: false,
  count: 0,
  chipText: '',
  windowTitle: 'CreAPP Suite',
  trayTitle: '',
});

function clampTray(text, max = 30) {
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

// Reduce la lista de jobs activos de /api/jobs/active a los textos de UI.
// Array vacío o no-array => estado idle. El copy de fase viene del motor
// (`current_step_label`); acá sólo se compone, no se inventa.
export function motorStatusFrom(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) return { ...IDLE };
  const count = jobs.length;
  if (count === 1) {
    const j = jobs[0] || {};
    const display = j.display_name || j.job_id || 'pieza';
    const label = j.current_step_label || 'Procesando…';
    return {
      active: true,
      count: 1,
      chipText: `Motor · ${display} · ${label}`,
      windowTitle: `${label} — CreAPP Suite`,
      trayTitle: clampTray(`● ${label}`),
    };
  }
  return {
    active: true,
    count,
    chipText: `Motor · ${count} piezas`,
    windowTitle: `Renderizando ${count} piezas — CreAPP Suite`,
    trayTitle: clampTray(`● ${count} piezas`),
  };
}

// Mapea un estado reducido a los efectos del main (overlay chip, título, tray),
// cada uno best-effort para que un efecto que lanza no corte los demás.
// `setTray(title, tooltip)`: en idle, título vacío y tooltip "CreAPP Suite".
export function applyMotorStatus(status, { send, setTitle, setTray } = {}) {
  try { send?.('desktop:motor-status', status); } catch { /* best-effort */ }
  try { setTitle?.(status.windowTitle); } catch { /* best-effort */ }
  try {
    setTray?.(status.active ? status.trayTitle : '', status.active ? status.trayTitle : 'CreAPP Suite');
  } catch { /* best-effort */ }
}

// Arranca el poll a /api/jobs/active. `onStatus(status)` se llama en cada tick
// (primer tick inmediato). Motor caído / error de red / JSON inválido => se emite
// estado idle (el chip/título/tray se limpian) y se reintenta. Devuelve stop().
export function startJobsActiveWatch({
  motorPort = 8000,
  intervalMs = 1500,
  fetchJson,
  onStatus,
  timers = globalThis,
} = {}) {
  const doFetch = fetchJson || defaultFetchJson;
  let inFlight = false; // evita apilar ticks a 1.5s si una respuesta tarda

  async function tick() {
    if (inFlight) return; // hay un fetch sin resolver: no lanzamos otro
    inFlight = true;
    let jobs;
    try {
      jobs = await doFetch(`http://127.0.0.1:${motorPort}/api/jobs/active`);
    } catch {
      jobs = []; // motor caído / error => idle, se reintenta al próximo tick
    } finally {
      inFlight = false;
    }
    const status = motorStatusFrom(jobs);
    try { onStatus?.(status); } catch { /* un consumidor que lanza no corta el poll */ }
  }

  const id = timers.setInterval(tick, intervalMs);
  tick(); // primer chequeo inmediato
  return () => timers.clearInterval(id);
}

function defaultFetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error('status ' + res.statusCode));
      }
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    // Endpoint colgado: cortar a 1s para no apilar fetches lentos a 1.5s de cadencia.
    req.setTimeout(1000, () => req.destroy(new Error('timeout')));
  });
}
