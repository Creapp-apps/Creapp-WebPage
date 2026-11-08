import type { TrackerClient, TrackerPiece, TrackerPieceStatus } from './contentTrackerTypes';

export const STATUS_LABEL: Record<TrackerPieceStatus, string> = {
  sent: 'Sin revisar',
  approved: 'Aprobada',
  changes_requested: 'Pidió cambios',
};

const RANK: Record<TrackerPieceStatus, number> = { changes_requested: 0, sent: 1, approved: 2 };

export function sortPieces(pieces: TrackerPiece[]): TrackerPiece[] {
  return [...pieces].sort((a, b) => RANK[a.status] - RANK[b.status]);
}

/** Clientes con cambios pedidos primero, luego pendientes, al final los todo-aprobado. */
export function sortClientsByUrgency(clients: TrackerClient[]): TrackerClient[] {
  const key = (c: TrackerClient) => (c.counts.changes > 0 ? 0 : c.counts.pending > 0 ? 1 : 2);
  return [...clients].sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name, 'es'));
}

export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.floor((now - t) / 60000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'hace 1 día' : `hace ${d} días`;
  return new Date(t).toLocaleDateString('es-AR');
}

export function plural(n: number, sing: string, plur: string): string {
  return `${n} ${n === 1 ? sing : plur}`;
}

export function summaryText(t: { clients: number; total: number; approved: number; changes: number; pending: number }): string {
  return [
    plural(t.clients, 'cliente', 'clientes'),
    plural(t.total, 'pieza', 'piezas'),
    plural(t.approved, 'aprobada', 'aprobadas'),
    plural(t.changes, 'pidió cambios', 'pidieron cambios'),
    `${t.pending} sin revisar`,
  ].join(' · ');
}
