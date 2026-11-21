import type { CronRunRow, ScheduledPostRow } from './launchesTypes';

export const STALE_MIN = 18;
export const STUCK_MIN = 20;

export type CronState = 'ok' | 'stale' | 'down' | 'error';
export interface CronHealth { state: CronState; lastRunAt: string | null; ageMin: number | null }

const ms = (iso: string | null | undefined): number => (iso ? new Date(iso).getTime() : NaN);
const minutesBetween = (from: number, now: Date): number => (now.getTime() - from) / 60000;

/**
 * Salud del cron. 'down' sin filas; 'error' si la corrida más reciente terminó en error;
 * 'ok' si la última corrida ok terminó hace <= STALE_MIN min; 'stale' si hace más (o si no hay ninguna ok).
 */
export function computeCronHealth(runs: CronRunRow[], now: Date): CronHealth {
  if (runs.length === 0) return { state: 'down', lastRunAt: null, ageMin: null };

  const latest = runs.reduce((a, b) => (ms(b.started_at) > ms(a.started_at) ? b : a));
  const lastOk = runs
    .filter((r) => r.outcome === 'ok' && r.finished_at)
    .reduce<CronRunRow | null>((a, b) => (!a || ms(b.finished_at) > ms(a.finished_at) ? b : a), null);

  const lastRunAt = lastOk?.finished_at ?? null;
  const ageMin = lastRunAt ? Math.max(0, Math.floor(minutesBetween(ms(lastRunAt), now))) : null;

  if (latest.outcome === 'error') return { state: 'error', lastRunAt, ageMin };
  if (ageMin === null || minutesBetween(ms(lastRunAt), now) > STALE_MIN) return { state: 'stale', lastRunAt, ageMin };
  return { state: 'ok', lastRunAt, ageMin };
}

/**
 * Fila trabada: queued/containerizing sin cambios > STUCK_MIN min y cron sano.
 * Con el cron caído/atrasado no es "fila trabada" sino caída de cron.
 */
export function isStuck(row: ScheduledPostRow, cronHealthy: boolean, now: Date): boolean {
  if (!cronHealthy) return false;
  if (row.status !== 'queued' && row.status !== 'containerizing') return false;
  const t = ms(row.updated_at);
  if (Number.isNaN(t)) return false;
  return minutesBetween(t, now) > STUCK_MIN;
}
