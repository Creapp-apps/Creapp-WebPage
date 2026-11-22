// Deep-link del panel admin: una notificación in-app trae
// `?tab=content_creator&preflight=<campaign_id>`. El `?tab` ya lo resuelve AdminPanel
// nativamente (useSearchParams); acá sólo vive el helper del src del iframe del Studio.

// Arma el src del iframe del Studio, agregando ?preflight=<id> sólo si viene.
export function studioSrc(base: string, preflight?: string): string {
  if (!preflight) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}preflight=${encodeURIComponent(preflight)}`;
}

// Extrae el campaign_id de un deep-link `...?...&preflight=<id>`. null si no viene.
// Sirve para re-disparar la apertura del preflight al reclickear la notificación,
// cuando navigate() a la misma URL es no-op y el iframe no recarga.
export function preflightIdFromUrl(url: string): string | null {
  const q = url.split('?')[1];
  if (!q) return null;
  const v = new URLSearchParams(q.split('#')[0]).get('preflight');
  return v || null;
}
