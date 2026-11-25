// Lógica pura del home del portal: próximas publicaciones (futuras, ordenadas).
// Ver spec §5.2. Genérico sobre cualquier ítem con `date: Date | null`.

/** La publicación futura más cercana (date > now), o null. */
export function nextPublication<T extends { date: Date | null }>(items: T[], now: Date): T | null {
  return upcomingPublications(items, now, 1)[0] ?? null;
}

/** Las publicaciones futuras ordenadas ascendente, hasta `limit` (default 3). */
export function upcomingPublications<T extends { date: Date | null }>(items: T[], now: Date, limit = 3): T[] {
  return items
    .filter((x): x is T & { date: Date } => x.date != null && x.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}
