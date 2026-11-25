// Lógica pura de Insights: selección de cliente, frescura de caché, shape de
// métricas de cuenta y pieza, orden y etiqueta de frescura. Sin side effects.
// Ver spec §6.4 / plan Task 2.

import type { AccountMetric, InsightsPayload, PieceInsight, PieceRow, PieceType, RawMetric } from './insightsTypes';

export type { AccountMetric, InsightsPayload, PieceInsight, PieceRow, PieceType, RawMetric } from './insightsTypes';

const ACCOUNT_LABELS: Record<string, string> = {
  reach: 'Alcance',
  profile_views: 'Visitas al perfil',
  accounts_engaged: 'Cuentas que interactuaron',
  total_interactions: 'Interacciones',
  likes: 'Me gusta',
  comments: 'Comentarios',
  shares: 'Compartidos',
  saves: 'Guardados',
  views: 'Reproducciones',
  profile_links_taps: 'Clics en enlaces',
};

// Métricas que NO son tiles de serie (se usan aparte o se omiten en P2).
const NON_TILE = new Set([
  'follower_count', 'follower_demographics', 'reached_audience_demographics',
  'engaged_audience_demographics', 'online_followers',
]);

/** Elige el slug del cliente a consultar. Sin requested → el primero; con requested
 *  debe ser miembro. Devuelve `{slug}` o `{error}` (403 ajeno, 404 sin clientes). */
export function pickClientSlug(
  clients: { slug: string }[],
  requested?: string | null,
): { slug: string } | { error: 403 | 404 } {
  if (clients.length === 0) return { error: 404 };
  if (!requested) return { slug: clients[0].slug };
  return clients.some((c) => c.slug === requested) ? { slug: requested } : { error: 403 };
}

const minutesSince = (iso: string | null, now: Date): number | null =>
  iso ? (now.getTime() - new Date(iso).getTime()) / 60_000 : null;

/** ¿El caché está dentro del TTL? null (sin caché) → false. */
export function isCacheFresh(fetchedAtISO: string | null, now: Date, ttlMin = 45): boolean {
  const m = minutesSince(fetchedAtISO, now);
  return m !== null && m < ttlMin;
}

/** ¿Se permite forzar refresh? Sin caché → true; si no, solo pasado el piso. */
export function canForceRefresh(fetchedAtISO: string | null, now: Date, floorMin = 5): boolean {
  const m = minutesSince(fetchedAtISO, now);
  return m === null || m >= floorMin;
}

/** Etiqueta humana de frescura ("recién", "hace N min", "hace N h"). */
export function freshnessLabel(fetchedAtISO: string, now: Date): string {
  const m = Math.floor((minutesSince(fetchedAtISO, now) ?? 0));
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

const sum = (vals: { value: number }[]): number => vals.reduce((a, v) => a + (v.value ?? 0), 0);

/** Normaliza un dato de /insights de cuenta a `values[]`, tolerando ambas formas
 *  de Graph: `metric_type=time_series` (`values[]`) y `total_value` (un valor). */
export function normalizeAccountDatum(d: any): { value: number; end_time?: string }[] | null {
  if (Array.isArray(d?.values)) return d.values;
  if (d?.total_value && typeof d.total_value.value === 'number') return [{ value: d.total_value.value }];
  return null;
}

/** Métricas de cuenta → tiles con serie + followerCount. Tolera métricas ausentes. */
export function mapAccountInsights(raw: RawMetric[]): { account: AccountMetric[]; followerCount: number | null } {
  const byName = new Map(raw.map((m) => [m.name, m]));
  const fc = byName.get('follower_count');
  const followerCount = fc?.values?.length ? fc.values[fc.values.length - 1].value : null;

  const account: AccountMetric[] = [];
  for (const m of raw) {
    if (NON_TILE.has(m.name)) continue;
    const values = m.values ?? [];
    account.push({
      key: m.name,
      label: ACCOUNT_LABELS[m.name] ?? m.name,
      total: sum(values),
      series: values.map((v) => ({ t: v.end_time ?? '', v: v.value })),
    });
  }
  return { account, followerCount };
}

function derivePieceType(platform: string | null): PieceType {
  const p = (platform ?? '').toLowerCase();
  if (p.includes('carousel')) return 'carousel';
  if (p.includes('reel') || p.includes('story')) return 'reel';
  return 'image';
}

/** Métricas por pieza. Pieza cuyo fetch falló (byId[id] == null) → métricas null. */
export function mapPieceInsights(rows: PieceRow[], byId: Record<string, RawMetric[] | null>): PieceInsight[] {
  return rows.map((row) => {
    const metrics = byId[row.published_media_id] ?? null;
    const val = (name: string): number | null => {
      const m = metrics?.find((x) => x.name === name);
      return m?.values?.[0]?.value ?? null;
    };
    return {
      mediaId: row.published_media_id,
      type: derivePieceType(row.platform),
      coverUrl: row.cover_r2_url,
      permalink: row.permalink,
      caption: row.caption,
      reach: val('reach'),
      likes: val('likes'),
      comments: val('comments'),
      shares: val('shares'),
      saved: val('saved'),
      total: val('total_interactions'),
    };
  });
}

/** Ordena piezas desc por la métrica dada; nulls al final. */
export function topPieces(pieces: PieceInsight[], by: 'reach' | 'saved'): PieceInsight[] {
  return [...pieces].sort((a, b) => {
    const av = a[by], bv = b[by];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  });
}
