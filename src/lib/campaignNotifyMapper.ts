export interface NotifyPiece {
  clientVisible: boolean;
  sentAt: string | null;
}

/**
 * Regla: solo cuentan las piezas visibles para el cliente.
 * - newCount: visibles con sentAt posterior al último aviso (o todas si nunca se avisó).
 *   Una pieza visible sin sentAt, con aviso previo, no se puede fechar: cuenta como actualizada.
 * - updatedCount: el resto de las visibles (ya existían al último aviso).
 * - total = newCount + updatedCount = cantidad de piezas visibles.
 */
export function countChangesSince(
  pieces: NotifyPiece[],
  lastSentAt: string | null,
): { newCount: number; updatedCount: number; total: number } {
  const visible = pieces.filter((p) => p.clientVisible);
  const last = lastSentAt ? Date.parse(lastSentAt) : null;
  const newCount = visible.filter((p) => {
    if (last === null) return true;
    return p.sentAt !== null && Date.parse(p.sentAt) > last;
  }).length;
  const updatedCount = visible.length - newCount;
  return { newCount, updatedCount, total: newCount + updatedCount };
}
