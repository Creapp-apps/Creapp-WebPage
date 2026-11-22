import http from 'node:http';

// Watcher de campañas pendientes de revisión (pre-flight) del motor local.
// Puro en su núcleo: `diffPending` no tiene efectos; el poll inyecta fetch/timers
// y los efectos (notificar, badge) para poder testearlo y para mapearlos en el
// main a `Notification` nativa de Electron + `app.dock.setBadge`.

// Dado el set de ids ya notificados y la lista actual de campañas pendientes,
// devuelve: a cuáles notificar (las nuevas), el próximo set de ids (las presentes
// ahora, así una que desaparece y vuelve re-notifica) y el badge (cantidad pendiente).
export function diffPending(prevIds, curr) {
  const currIds = new Set(curr.map(c => c.campaign_id));
  const toNotify = curr.filter(c => !prevIds.has(c.campaign_id));
  return { toNotify, nextIds: currIds, badge: currIds.size }; // Set usa .size, no .length
}

// Arranca el poll al motor local. `notify(campaign)` y `setBadge(n)` se inyectan.
// Ante motor caído / respuesta no-200 / JSON inválido, el tick no toca el estado
// ni notifica basura: reintenta en el próximo intervalo. Devuelve stop().
export function startPreflightWatch({
  motorPort = 8000,
  intervalMs = 20000,
  fetchJson,
  notify,
  setBadge,
  timers = globalThis,
} = {}) {
  let notifiedIds = new Set();
  const doFetch = fetchJson || defaultFetchJson;

  async function tick() {
    let data;
    try {
      data = await doFetch(`http://127.0.0.1:${motorPort}/api/campaigns/pending-review`);
    } catch {
      return; // motor caído / error de red → se reintenta
    }
    if (!data || !Array.isArray(data.campaigns)) return;
    const { toNotify, nextIds, badge } = diffPending(notifiedIds, data.campaigns);
    notifiedIds = nextIds;
    for (const c of toNotify) {
      try { notify?.(c); } catch { /* una notificación fallida no corta el tick */ }
    }
    try { setBadge?.(badge); } catch { /* idem */ }
  }

  const id = timers.setInterval(tick, intervalMs);
  tick(); // primer chequeo inmediato
  return () => timers.clearInterval(id);
}

function defaultFetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error('status ' + res.statusCode));
      }
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
