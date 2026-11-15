import React from 'react';
import { usePresence } from './usePresence';

const MOTOR_BASE = 'http://localhost:8000';

function hace(s: number | null): string {
  if (s == null) return '';
  if (s < 60) return `hace ${Math.round(s)} s`;
  return `hace ${Math.round(s / 60)} min`;
}

export function PresenceSemaphore() {
  const p = usePresence(MOTOR_BASE);
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200"
      role="status"
    >
      {p.connected ? (
        <>
          <span aria-hidden>🟢</span>
          <strong className="text-indigo-300">Conectada · listos para trabajar</strong>
          <span className="text-zinc-400">
            {p.agent ?? ''}
            {p.ageSeconds != null ? ` · ${hace(p.ageSeconds)}` : ''}
          </span>
        </>
      ) : (
        <>
          <span aria-hidden>🔴</span>
          <strong>Desconectada</strong>
        </>
      )}
    </div>
  );
}

export default PresenceSemaphore;
