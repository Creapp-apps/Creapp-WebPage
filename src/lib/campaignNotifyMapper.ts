export interface NotifyPiece {
  clientVisible: boolean;
  sentAt: string | null;
}

/**
 * Regla: solo cuentan las piezas visibles para el cliente.
 * - changedCount: visibles con sentAt posterior al último aviso (o todas si nunca se avisó).
 *   Una pieza visible sin sentAt, con aviso previo, no se puede fechar y no cuenta.
 * - total: cantidad de piezas visibles.
 */
export function countChangesSince(
  pieces: NotifyPiece[],
  lastSentAt: string | null,
): { changedCount: number; total: number } {
  const visible = pieces.filter((p) => p.clientVisible);
  const last = lastSentAt ? Date.parse(lastSentAt) : null;
  const changedCount = visible.filter((p) => {
    if (last === null) return true;
    return p.sentAt !== null && Date.parse(p.sentAt) > last;
  }).length;
  return { changedCount, total: visible.length };
}
