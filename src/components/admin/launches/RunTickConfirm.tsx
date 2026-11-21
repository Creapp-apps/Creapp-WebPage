import React from 'react';
import { Loader2, Play } from 'lucide-react';
import type { LaunchPiece } from '@/lib/launchesTypes';

interface Props {
  pieces: LaunchPiece[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Piezas que el tick va a tomar: en cola / preparando / listas. */
export const RunTickConfirm: React.FC<Props> = ({ pieces, busy, onConfirm, onCancel }) => {
  const due = pieces.filter((p) => ['queued', 'containerizing', 'ready'].includes(p.status));
  const clients = Array.from(new Set(due.map((p) => p.clientName)));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e12] p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Correr tick ahora</h3>
        <p className="text-sm text-zinc-300">
          Se van a procesar hasta <b>{due.length}</b> {due.length === 1 ? 'pieza' : 'piezas'}
          {clients.length > 0 ? <> de {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</> : null}.
          Las que estén listas se publican de verdad.
        </p>
        {clients.length > 0 && (
          <ul className="text-xs text-zinc-400 list-disc pl-5 max-h-32 overflow-auto">
            {clients.map((c) => (
              <li key={c}>{c}: {due.filter((p) => p.clientName === c).length}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/30 disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Correr tick
          </button>
        </div>
      </div>
    </div>
  );
};
