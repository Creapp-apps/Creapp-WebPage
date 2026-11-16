export interface PresenceState {
  connected: boolean;
  agent: string | null;
  ageSeconds: number | null;
  reachable: boolean;
  cwd: string | null;
  sessionId: string | null;
}

export const PRESENCE_UNREACHABLE: PresenceState = {
  connected: false,
  agent: null,
  ageSeconds: null,
  reachable: false,
  cwd: null,
  sessionId: null,
};

export function mapPresence(json: any): PresenceState {
  return {
    connected: !!json?.connected,
    agent: json?.agent ?? null,
    ageSeconds: json?.age_seconds ?? null,
    reachable: true,
    cwd: json?.cwd ?? null,
    sessionId: json?.session_id ?? null,
  };
}

/** Etiqueta corta y legible de la sesión conectada: carpeta del repo + id corto. */
export function presenceLabel(p: PresenceState): string {
  const parts: string[] = [];
  if (p.cwd) {
    const segs = p.cwd.replace(/\/+$/, '').split('/').filter(Boolean);
    const base = segs[segs.length - 1] || p.cwd;
    parts.push(segs.length > 1 ? `…/${base}` : base);
  }
  if (p.sessionId) parts.push(p.sessionId.slice(0, 6));
  return parts.join(' · ');
}

export async function fetchPresence(
  motorBase: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<PresenceState> {
  try {
    const res = await fetchImpl(`${motorBase}/api/session/presence`);
    if (!res.ok) return { ...PRESENCE_UNREACHABLE };
    return mapPresence(await res.json());
  } catch {
    return { ...PRESENCE_UNREACHABLE };
  }
}
