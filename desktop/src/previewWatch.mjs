import http from 'node:http';

// Watcher de "previews listos" (Pre-flight de Preview) del motor local.
// Clona preflightWatch.mjs: núcleo puro (`diffPending`) + efectos inyectados
// (notify/setBadge) que el main mapea a Notification nativa + app.dock.setBadge.
// Spec: Creador de Contenidos/docs/superpowers/specs/2026-11-24-preflight-preview-design.md

// Deep-link al tab Creador de Contenidos abriendo la sección Preview de un item.
// `base` es la url del uiServer (ej. http://127.0.0.1:4599/).
export function previewDeepLink(base, previewId) {
  return `${base}admin?tab=content_creator&preview=${encodeURIComponent(previewId)}`;
}

// Dado el set de ids ya notificados y la lista actual de previews pendientes,
// devuelve a cuáles notificar (las nuevas), el próximo set de ids y el badge.
export function diffPending(prevIds, curr) {
  const currIds = new Set(curr.map((p) => p.id));
  const toNotify = curr.filter((p) => !prevIds.has(p.id));
  return { toNotify, nextIds: currIds, badge: currIds.size };
}

// Arranca el poll al motor local. `notify(preview)` y `setBadge(n)` se inyectan.
// Motor caído / no-200 / JSON inválido → el tick no toca estado ni notifica basura.
export function startPreviewWatch({
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
      data = await doFetch(`http://127.0.0.1:${motorPort}/api/previews/pending`);
    } catch {
      return; // motor caído / error de red → se reintenta
    }
    if (!data || !Array.isArray(data.previews)) return;
    const { toNotify, nextIds, badge } = diffPending(notifiedIds, data.previews);
    notifiedIds = nextIds;
    for (const p of toNotify) {
      try { notify?.(p); } catch { /* una notificación fallida no corta el tick */ }
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
