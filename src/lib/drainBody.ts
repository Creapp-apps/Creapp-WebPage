/** Parte el body de un Log Drain (array JSON o NDJSON) en entradas. Líneas inválidas se ignoran. */
export function splitDrainEntries(raw: string): unknown[] {
  const text = (raw ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  const out: unknown[] = [];
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    try { out.push(JSON.parse(l)); } catch { /* línea corrupta: se ignora */ }
  }
  return out;
}
