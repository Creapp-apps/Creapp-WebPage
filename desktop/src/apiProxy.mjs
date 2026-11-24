import path from 'node:path';
import { pathToFileURL } from 'node:url';

// En la web (Vercel) las rutas /api/places/* son funciones serverless que leen la
// Google Maps key del entorno del servidor. El desktop sirve solo estáticos de dist
// vía uiServer, así que esas rutas caían al fallback SPA (index.html) y el scraper
// recibía HTML en vez de JSON. Este proxy corre, en el proceso del desktop, EXACTAMENTE
// la misma función serverless del repo web (import dinámico de <creappPath>/api/...),
// sin duplicar la lógica de Google. Una sola fuente de verdad.

// Solo delegamos /api/places/* (lo que usa el lead scraper). El resto del /api/*
// sigue cayendo al fallback SPA como antes; sus clientes ya tienen sus propios fallbacks.
const ALLOWED_PREFIX = '/api/places/';
const SEGMENT_RE = /^[a-z0-9_-]+$/i;

function vercelResShim(res) {
  // Adapta el res crudo de node:http a la interfaz que esperan las funciones de Vercel
  // (setHeader + status().json() + end()).
  let statusCode = 200;
  return {
    setHeader: (k, v) => res.setHeader(k, v),
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(obj));
    },
    end(body) {
      res.writeHead(statusCode, {});
      res.end(body);
    },
  };
}

const defaultImportHandler = async (file) => {
  const mod = await import(pathToFileURL(file).href);
  return mod.default;
};

// Devuelve true si la petición fue /api/places/* y la manejó (respondió res).
// Devuelve false si no corresponde a este proxy (el caller sigue con el flujo normal).
export async function handleApiProxy(
  { pathname, search = '', method = 'GET', req, res, config },
  { importHandler = defaultImportHandler } = {}
) {
  if (!pathname.startsWith(ALLOWED_PREFIX)) return false;

  // /api/places/search -> ['places','search']; validamos cada segmento (anti traversal).
  const segments = pathname.slice('/api/'.length).split('/').filter(Boolean);
  if (segments.length < 2 || !segments.every((s) => SEGMENT_RE.test(s))) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return true;
  }

  const query = Object.fromEntries(new URLSearchParams(search));
  // Si el cliente no mandó key (no la cargó en Settings), caemos a la de la config del
  // desktop (~/.creapp-desktop/config.json) o al entorno del proceso.
  if (!query.key) {
    const fallbackKey =
      (config && config.googleMapsApiKey) ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      '';
    if (fallbackKey) query.key = fallbackKey;
  }

  const file = path.join(config.creappPath, 'api', ...segments) + '.js';

  try {
    const handler = await importHandler(file);
    if (typeof handler !== 'function') {
      // La función no existe en este repo (p. ej. /api/places/reviews): el cliente ya
      // trata esto como "sin datos", así que respondemos un 200 inocuo en vez de HTML.
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, results: [], reviews: [] }));
      return true;
    }
    await handler({ ...(req || {}), method, query }, vercelResShim(res));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, error: 'Proxy /api/places falló', details: err?.message }));
  }
  return true;
}
