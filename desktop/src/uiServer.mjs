import path from 'node:path';
import { handleApiProxy } from './apiProxy.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function mimeFor(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

// El Radar (GoogleRadarMap) carga el SDK de Maps en el navegador y el scraper arma
// &key= leyendo localStorage.creapp_google_maps_api_key. En el desktop ese localStorage
// nace vacío. Inyectamos un <script> que lo siembra con la key del config ANTES de que
// corra el bundle (sin pisar una key que el usuario ya haya cargado a mano). Así la key
// llega al renderer sin rebuild del dist ni cambios en el cliente.
export function injectMapsKey(buf, config) {
  const key = config && config.googleMapsApiKey;
  if (!key) return buf;
  const html = buf.toString('utf8');
  const snippet =
    '<script>try{if(!window.localStorage.getItem("creapp_google_maps_api_key"))' +
    'window.localStorage.setItem("creapp_google_maps_api_key",' +
    JSON.stringify(String(key)) +
    ');}catch(e){}</script>';
  const out = html.includes('<head>')
    ? html.replace('<head>', '<head>' + snippet)
    : snippet + html;
  return Buffer.from(out, 'utf8');
}

// Sirve <creappPath>/dist con fallback SPA (react-router BrowserRouter).
export async function startUiServer(config, { http, fs }) {
  const dist = path.resolve(config.creappPath, 'dist');
  const indexPath = path.join(dist, 'index.html');

  const send = (res, status, file, body) => {
    res.writeHead(status, { 'Content-Type': mimeFor(file) });
    res.end(body);
  };

  const handler = async (req, res) => {
    try {
      let url;
      try {
        url = new URL(req.url, 'http://127.0.0.1');
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad request');
      }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\0')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad request');
      }
      // Proxy a las funciones serverless /api/places/* del repo web (lead scraper).
      // Si no corresponde, devuelve false y seguimos con el flujo estático/SPA.
      if (
        await handleApiProxy({
          pathname,
          search: url.search,
          method: req.method,
          req,
          res,
          config,
        })
      ) {
        return;
      }
      const target = path.resolve(dist, '.' + path.sep + pathname);
      if (target !== dist && !target.startsWith(dist + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
      }
      if (target !== dist) {
        try {
          const body = await fs.readFile(target);
          return send(res, 200, target, target === indexPath ? injectMapsKey(body, config) : body);
        } catch { /* no es un asset: cae al index */ }
      }
      send(res, 200, indexPath, injectMapsKey(await fs.readFile(indexPath), config));
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('UI no disponible');
    }
  };

  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(config.uiPort, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${config.uiPort}/`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
