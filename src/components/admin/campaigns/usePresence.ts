import { useEffect, useState } from 'react';
import { fetchPresence, PRESENCE_UNREACHABLE, type PresenceState } from '../../../lib/presence';

export function usePresence(motorBase: string, intervalMs = 4000): PresenceState {
  const [state, setState] = useState<PresenceState>(PRESENCE_UNREACHABLE);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const s = await fetchPresence(motorBase);
      if (alive) setState(s);
    };
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [motorBase, intervalMs]);
  return state;
}
