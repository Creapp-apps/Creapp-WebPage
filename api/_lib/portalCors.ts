// CORS restringido al origen del portal para los endpoints de acción de
// Lanzamientos (admin-authed). A diferencia de los endpoints viejos (CORS `*`),
// estos sólo reflejan el `Origin` si pertenece al allowlist del portal.
//
// Allowlist: defaults de producción + PORTAL_ORIGIN / VITE_PUBLIC_SITE_URL
// (coma-separables) + localhost de dev. Si el Origin no está, no se setea
// Allow-Origin y el browser bloquea la respuesta.

function buildAllowlist(env: Record<string, string | undefined>): Set<string> {
  const out = new Set<string>([
    'https://creapp.com.ar',
    'https://www.creapp.com.ar',
    'http://localhost:5173',
    'http://localhost:3000',
  ]);
  for (const key of ['PORTAL_ORIGIN', 'VITE_PUBLIC_SITE_URL', 'PORTAL_BASE']) {
    const raw = env[key];
    if (!raw) continue;
    for (const o of raw.split(',')) {
      const trimmed = o.trim().replace(/\/+$/, '');
      if (trimmed) out.add(trimmed);
    }
  }
  return out;
}

// Setea los headers de CORS. Devuelve true si el request es un preflight
// OPTIONS (el caller responde 200 y corta).
export function applyPortalCors(req, res): boolean {
  const allowed = buildAllowlist(process.env);
  const origin = req.headers?.origin;
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return req.method === 'OPTIONS';
}
