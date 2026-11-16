import React from 'react';
import { usePresence } from './usePresence';
import { presenceLabel } from '../../../lib/presence';

const MOTOR_BASE = 'http://localhost:8000';

function hace(s: number | null): string {
  if (s == null) return '';
  if (s < 60) return `hace ${Math.round(s)} s`;
  return `hace ${Math.round(s / 60)} min`;
}

export function PresenceSemaphore() {
  const p = usePresence(MOTOR_BASE);
  const sesion = p.connected ? presenceLabel(p) : '';
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200"
      role="status"
      title={p.connected && p.cwd ? `Terminal conectada: ${p.cwd}${p.sessionId ? ` (${p.sessionId})` : ''}` : undefined}
    >
      {p.connected ? (
        <>
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <strong className="text-violet-300">Conectada · listos para trabajar</strong>
          <span className="text-zinc-400">
            {p.agent ?? ''}
            {sesion ? ` · ${sesion}` : ''}
            {p.ageSeconds != null ? ` · ${hace(p.ageSeconds)}` : ''}
          </span>
        </>
      ) : (
        <>
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-rose-500" />
          <strong>Desconectada</strong>
        </>
      )}
    </div>
  );
}

export default PresenceSemaphore;
