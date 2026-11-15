export interface PresenceState {
  connected: boolean;
  agent: string | null;
  ageSeconds: number | null;
  reachable: boolean;
}

export const PRESENCE_UNREACHABLE: PresenceState = {
  connected: false,
  agent: null,
  ageSeconds: null,
  reachable: false,
};

export function mapPresence(json: any): PresenceState {
  return {
    connected: !!json?.connected,
    agent: json?.agent ?? null,
    ageSeconds: json?.age_seconds ?? null,
    reachable: true,
  };
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
