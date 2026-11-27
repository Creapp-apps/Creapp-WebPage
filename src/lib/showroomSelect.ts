import type { CalendarPiece } from './calendarTypes';

/**
 * Piezas del showroom "Mis Piezas": solo publicadas con media,
 * más nuevas primero; sin fecha al final. Función pura, no muta la entrada.
 */
export function selectPublishedPieces(pieces: CalendarPiece[]): CalendarPiece[] {
  return pieces
    .filter(p => p.published && p.mediaUrls.length > 0)
    .slice()
    .sort((a, b) => {
      if (a.date === null && b.date === null) return 0;
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return b.date.getTime() - a.date.getTime();
    });
}
