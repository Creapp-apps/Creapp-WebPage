import type { PortalPiece } from './portalTypes';

// Lógica pura de la cola de revisión del portal: una pieza a la vez, en orden
// reel → carrusel → historia. 'sent' es el único estado pendiente ('approved' y
// 'changes_requested' ya están decididos).

const ORDER: PortalPiece['type'][] = ['reel', 'carousel', 'story'];

/** Ordena las piezas reel → carrusel → historia, estable dentro de cada tipo. */
export function orderReview<T extends { type: PortalPiece['type'] }>(pieces: T[]): T[] {
  return pieces
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (ORDER.indexOf(a.p.type) - ORDER.indexOf(b.p.type)) || (a.i - b.i))
    .map((x) => x.p);
}

type HasStatus = Pick<PortalPiece, 'status'>;
const isPending = (p: HasStatus) => p.status === 'sent';

/** Índice de la primera pieza pendiente; 0 si no hay ninguna (o lista vacía). */
export function firstPendingIndex(pieces: HasStatus[]): number {
  const i = pieces.findIndex(isPending);
  return i === -1 ? 0 : i;
}

/** Próxima pendiente buscando from+1..end y luego 0..from-1; null si no queda. */
export function nextPendingIndex(pieces: HasStatus[], from: number): number | null {
  const n = pieces.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (i === from) break;
    if (isPending(pieces[i])) return i;
  }
  return null;
}

/** Conteo de estados para el resumen del cierre. */
export function reviewSummary(pieces: HasStatus[]): { total: number; approved: number; changes: number; pending: number } {
  let approved = 0, changes = 0, pending = 0;
  for (const p of pieces) {
    if (p.status === 'approved') approved++;
    else if (p.status === 'changes_requested') changes++;
    else if (p.status === 'sent') pending++;
  }
  return { total: pieces.length, approved, changes, pending };
}
