// Lógica pura del proxy de descarga de "Mis Piezas". Sin IO, sin DOM, sin Supabase.

export type ProxyRow = { client_id: string; status: string; media_r2_urls: string[] | null };

export type PieceAuth = { ok: true } | { ok: false; status: 403 | 404 };

export function authorizePiece(row: ProxyRow | null, memberSlugs: string[]): PieceAuth {
  if (!row) return { ok: false, status: 404 };
  if (!memberSlugs.includes(row.client_id)) return { ok: false, status: 403 };
  if (row.status !== 'published') return { ok: false, status: 404 };
  return { ok: true };
}

export function pickMediaUrl(row: ProxyRow, index: number): string | null {
  return row.media_r2_urls?.[index] ?? null;
}

function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'pieza';
}

function extFromUrl(url: string): string {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url.split(/[?#]/)[0];
  }
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'mp4';
}

export function safeFilename(opts: { brand: string; type: string; date: string | null; url: string }): string {
  const datePart = opts.date && /^\d{4}-\d{2}-\d{2}/.test(opts.date) ? opts.date.slice(0, 10) : 'pieza';
  return `${slugify(opts.brand)}-${slugify(opts.type)}-${datePart}.${extFromUrl(opts.url)}`;
}
