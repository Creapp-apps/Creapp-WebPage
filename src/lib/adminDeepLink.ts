// Deep-link del panel admin: una notificación in-app trae
// `?tab=content_creator&preflight=<campaign_id>`. El `?tab` ya lo resuelve AdminPanel
// nativamente (useSearchParams); acá sólo vive el helper del src del iframe del Studio.

// Arma el src del iframe del Studio, agregando ?preflight=<id> sólo si viene.
export function studioSrc(base: string, preflight?: string): string {
  if (!preflight) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}preflight=${encodeURIComponent(preflight)}`;
}
