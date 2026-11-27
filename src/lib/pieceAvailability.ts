/**
 * Disponibilidad de media en R2 por pieza. Lógica pura: el chequeo HTTP
 * (`head`) se inyecta; este módulo no hace IO.
 */
export async function buildAvailabilityMap(
  urlById: Record<string, string | null>,
  head: (url: string) => Promise<boolean>,
): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    Object.entries(urlById).map(async ([id, url]) => {
      const available = url ? await head(url) : false;
      return [id, available] as const;
    }),
  );
  return Object.fromEntries(entries);
}
