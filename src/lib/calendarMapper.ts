// Lógica pura del calendario del cliente: derivación de tipo, día local (TZ),
// estado de celda, mapeo de filas y grilla de mes. Sin side effects (testeable).
// Ver docs/superpowers/specs/2026-11-25-portal-cliente-shell-calendario-design.md

import type { CalJobRow, CalendarPiece, CellState, PieceType, SchedRowSafe } from './calendarTypes';

export type { CalJobRow, CalendarPiece, CellState, PieceType, SchedRowSafe } from './calendarTypes';

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';

/** Deriva el tipo de pieza de la plataforma (instagram_reel/carousel/story). */
export function deriveType(platform: string | null): PieceType {
  const p = (platform ?? '').toLowerCase();
  if (p.includes('carousel')) return 'carousel';
  if (p.includes('story')) return 'story';
  return 'reel';
}

/** Clave `YYYY-MM-DD` del instante ISO en hora local (default AR). */
export function toLocalDayKey(iso: string, tz: string = DEFAULT_TZ): string {
  // en-CA formatea como YYYY-MM-DD; timeZone hace la conversión.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** Estado de la celda: publicado gana; si pasó su hora sin publicar = in_process; si no = future. */
export function cellState(piece: CalendarPiece, now: Date): CellState {
  if (piece.published) return 'published';
  if (piece.date && piece.date.getTime() <= now.getTime()) return 'in_process';
  return 'future';
}

/** Mapea filas de scheduled_posts (+ jobs) a piezas, scopeadas a la campaña activa. */
export function mapScheduledRows(
  rows: SchedRowSafe[],
  jobs: CalJobRow[],
  opts: { campaignId?: string | null },
): CalendarPiece[] {
  const jobByMotor = new Map(jobs.map((j) => [j.job_id_motor, j]));
  const out: CalendarPiece[] = [];
  for (const r of rows) {
    const job = jobByMotor.get(r.job_id);
    // Scoping por campaña: si se pide una campaña, solo filas cuyo job pertenezca a ella.
    if (opts.campaignId != null && job?.campaign_id !== opts.campaignId) continue;
    out.push({
      id: r.id,
      jobIdMotor: r.job_id,
      campaignId: job?.campaign_id ?? null,
      date: r.scheduled_at ? new Date(r.scheduled_at) : null,
      type: deriveType(r.platform),
      platform: r.platform,
      coverUrl: r.cover_r2_url ?? job?.coverUrl ?? null,
      mediaUrls: r.media_r2_urls ?? [],
      caption: r.caption,
      permalink: r.permalink,
      published: r.status === 'published',
    });
  }
  return out;
}

/** Mes (AR-local) a mostrar por default: el de la primera pieza con fecha; si no, el de `now`. */
export function firstPieceMonth(
  pieces: { date: Date | null }[],
  now: Date = new Date(),
  tz: string = DEFAULT_TZ,
): { year: number; month0: number } {
  const dated = pieces.find((p) => p.date);
  const key = toLocalDayKey((dated?.date ?? now).toISOString(), tz); // YYYY-MM-DD
  const [y, m] = key.split('-').map(Number);
  return { year: y, month0: m - 1 };
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Grilla de 42 celdas (6×7) del mes; semana arranca lunes; valores `YYYY-MM-DD` o null. */
export function monthGrid(year: number, monthIndex0: number): (string | null)[] {
  const firstDow = (new Date(year, monthIndex0, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - firstDow + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? `${year}-${pad(monthIndex0 + 1)}-${pad(dayNum)}` : null);
  }
  return cells;
}
