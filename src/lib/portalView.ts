import type { PortalCampaign, PortalPiece } from './portalTypes';

export type BrandMark =
  | { kind: 'logo'; url: string; name: string }
  | { kind: 'name'; name: string };

// Logo real o nombre en serif. Nunca monograma/iniciales inventadas.
export function pickBrandMark(client: { name: string; logoUrl: string | null }): BrandMark {
  const url = client.logoUrl?.trim();
  return url ? { kind: 'logo', url, name: client.name } : { kind: 'name', name: client.name };
}

export function campaignViewState(c: Pick<PortalCampaign, 'pieces'> | null | undefined): 'loading' | 'empty' | 'ready' {
  if (c === undefined) return 'loading';
  if (c === null || !c.pieces || c.pieces.length === 0) return 'empty';
  return 'ready';
}

const FALLBACK = ['#002655', '#F4F1EA', '#9A5B34', '#C08457', '#0c2b4f'];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function paletteSwatches(colors: Record<string, string> | null | undefined): string[] {
  const v = Object.values(colors ?? {}).filter((x) => typeof x === 'string' && HEX.test(x.trim())).map((x) => x.trim());
  return v.length ? v.slice(0, 6) : FALLBACK;
}

// Solo las que esperan mirada: nunca pisa una aprobada ni un pedido de cambios.
export function pendingToApprove<T extends Pick<PortalPiece, 'status'>>(pieces: T[]): T[] {
  return pieces.filter((p) => p.status === 'sent');
}

export function typeMeta(type: string) {
  return (TYPE_META as Record<string, (typeof TYPE_META)['reel']>)[type] ?? { title: 'Piezas', singular: 'Pieza', hint: 'contenido', cls: 'g-reels' };
}

export function progressSummary(pieces: Pick<PortalPiece, 'id' | 'status'>[]) {
  const total = pieces.length;
  const approved = pieces.filter((p) => p.status === 'approved').length;
  const pendingIds = pendingToApprove(pieces).map((p) => p.id);
  const changes = pieces.filter((p) => p.status === 'changes_requested').length;
  return { total, approved, pending: pendingIds.length, changes, pendingIds, pct: total ? Math.round((approved / total) * 100) : 0 };
}

const ORDER: PortalPiece['type'][] = ['reel', 'carousel', 'story'];
export function groupPieces<T extends Pick<PortalPiece, 'type'>>(pieces: T[]) {
  return ORDER.map((type) => ({ type, pieces: pieces.filter((p) => p.type === type) })).filter((g) => g.pieces.length > 0);
}

export const TYPE_META: Record<PortalPiece['type'], { title: string; singular: string; hint: string; cls: string }> = {
  reel: { title: 'Reels', singular: 'Reel', hint: 'video vertical', cls: 'g-reels' },
  carousel: { title: 'Carruseles', singular: 'Carrusel', hint: 'para el feed', cls: 'g-carr' },
  story: { title: 'Historias', singular: 'Historia', hint: '24 h', cls: 'g-hist' },
};

const TAGS: Record<string, string[]> = {
  cinematic_broll: ['Cinematográfico', 'Luz cálida', 'Tomas reales'],
  executive_wealth: ['Sobrio', 'Alta gama', 'Editorial'],
  cyber_hud: ['Tecnológico', 'Neón', 'Datos en vivo'],
  creator_lifestyle: ['Editorial', 'Estilo de vida', 'Luz suave'],
  minimal_clean: ['Minimalista', 'Limpio', 'Tipografía sobria'],
};
export function styleTags(aesthetic: string | null | undefined): string[] {
  return (aesthetic && TAGS[aesthetic]) || [];
}

// Campaña elegida por ?campaign=<id>; si no está entre las del cliente, la más reciente (lista ya ordenada).
export function pickCampaign<T extends { id: string }>(campaigns: T[], id: string | null | undefined): T | null {
  if (campaigns.length === 0) return null;
  return (id && campaigns.find((c) => c.id === id)) || campaigns[0];
}
