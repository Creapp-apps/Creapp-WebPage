// Modo "campaña en vivo": arma una campaña sintética desde scheduled_posts cuando
// el cliente no tiene content_campaigns (ya publicó sin pasar por review).
// Ver spec §4.2. Lógica pura.

import type { PortalCampaign } from './portalTypes';
import { toLocalDayKey } from './calendarMapper';
import { nextPublication } from './portalHome';

/** Campaña sintética read-only para un cliente con scheduled_posts y sin jobs. */
export function buildLiveCampaign(
  client: PortalCampaign['client'],
  rows: { scheduled_at: string | null }[],
): PortalCampaign {
  const dates = rows.map((r) => r.scheduled_at).filter((x): x is string => !!x);
  const earliest = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  const month = earliest ? toLocalDayKey(earliest).slice(0, 7) : null; // YYYY-MM AR-local
  return {
    id: '__live__',
    live: true,
    title: null,
    month,
    concept: null,
    aesthetic: null,
    client,
    pieces: [],
  };
}

/** Tarjetas del Home en modo en vivo, derivadas del calendario. */
export function liveStats(
  pieces: { date: Date | null; published: boolean }[],
  now: Date,
): { total: number; published: number; next: Date | null } {
  return {
    total: pieces.length,
    published: pieces.filter((p) => p.published).length,
    next: nextPublication(pieces, now)?.date ?? null,
  };
}
