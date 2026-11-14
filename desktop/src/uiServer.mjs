import path from 'node:path';

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
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad request');
      }
      if (pathname.includes('\0')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad request');
      }
      const target = path.resolve(dist, '.' + path.sep + pathname);
      if (target !== dist && !target.startsWith(dist + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden');
      }
      if (target !== dist) {
        try {
          return send(res, 200, target, await fs.readFile(target));
        } catch { /* no es un asset: cae al index */ }
      }
      send(res, 200, indexPath, await fs.readFile(indexPath));
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
