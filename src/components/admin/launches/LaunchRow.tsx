import React, { useState } from 'react';
import { ExternalLink, Eye, ImageOff, Loader2, TriangleAlert } from 'lucide-react';
import { actionError, canCancel, canForce, canReschedule, canRetry, type LaunchAction } from '@/lib/launchesActions';
import { callCancel, callForce, callReschedule, callRetry } from '@/lib/launchesService';
import type { LaunchPiece } from '@/lib/launchesTypes';

export const STATUS_LABEL: Record<string, string> = {
  queued: 'Programada', containerizing: 'Preparando', ready: 'Lista', publishing: 'Publicando',
  published: 'Publicada', error: 'Error', cancelled: 'Cancelada',
};
const STATUS_CLS: Record<string, string> = {
  queued: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  containerizing: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  ready: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  publishing: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  cancelled: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const errMsg = (e: unknown): string => {
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : 'No se pudo completar la acción.';
};

const toLocalInput = (iso: string | null): string => {
  const d = iso ? new Date(iso) : new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

interface Props { piece: LaunchPiece; readOnly: boolean; onChanged: () => void }

export const LaunchRow: React.FC<Props> = ({ piece, readOnly, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resched, setResched] = useState<string | null>(null);

  const run = async (action: LaunchAction, fn: () => Promise<unknown>, confirmText?: string): Promise<boolean> => {
    if (busy) return false;
    const guard = actionError(action, piece.status, piece.stuck);
    if (guard) { setErr(guard); return false; }
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true); setErr(null);
    try { await fn(); onChanged(); return true; } catch (e) { setErr(errMsg(e)); return false; } finally { setBusy(false); }
  };

  const btn = 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed';
  const when = piece.scheduledAt ? new Date(piece.scheduledAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shrink-0 flex items-center justify-center text-zinc-600">
        {piece.coverUrl ? <img src={piece.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageOff size={16} />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-sm text-white font-medium truncate block">{piece.title || piece.jobId}</span>
            <span className="text-[11px] text-zinc-500">{piece.clientName} · {piece.type ?? 'pieza'} · {when}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {piece.stuck && (
              <span
                title={piece.errorMessage
                  || 'En cola sin avanzar: ya pasó su ventana de preparación y el cron está sano, pero la pieza no progresó. Probá Reintentar o Forzar.'}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-500/10 text-amber-300 border-amber-500/25 cursor-help">
                <TriangleAlert size={11} /> Fila trabada
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_CLS[piece.status] ?? STATUS_CLS.queued}`}>
              {STATUS_LABEL[piece.status] ?? piece.status}
            </span>
          </div>
        </div>
        {piece.errorMessage && <p className="text-xs text-rose-300 leading-relaxed">{piece.errorMessage}</p>}
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {piece.coverUrl && (
            <a href={piece.coverUrl} target="_blank" rel="noreferrer" className={btn}><Eye size={11} /> Previsualizar</a>
          )}
          {piece.permalink && (
            <a href={piece.permalink} target="_blank" rel="noreferrer" className={btn}><ExternalLink size={11} /> Abrir post</a>
          )}
          {!readOnly && canRetry(piece.status, piece.stuck) && (
            <button type="button" disabled={busy} className={btn}
              onClick={() => run('retry', () => callRetry({ id: piece.id }), '¿Reintentar esta publicación? Puede publicarse de verdad.')}>Reintentar</button>
          )}
          {!readOnly && canForce(piece.status) && (
            <button type="button" disabled={busy} className={btn}
              onClick={() => run('force', () => callForce({ id: piece.id }), '¿Forzar? Avanza la pieza hasta donde su horario lo permite (no publica antes de hora). Puede publicar de verdad.')}>Forzar</button>
          )}
          {!readOnly && canReschedule(piece.status) && resched === null && (
            <button type="button" disabled={busy} className={btn} onClick={() => setResched(toLocalInput(piece.scheduledAt))}>Reprogramar</button>
          )}
          {!readOnly && canCancel(piece.status) && (
            <button type="button" disabled={busy} className={btn}
              onClick={() => run('cancel', () => callCancel({ id: piece.id }), '¿Cancelar esta publicación?')}>Cancelar</button>
          )}
          {busy && <Loader2 size={13} className="animate-spin text-zinc-500" />}
        </div>
        {!readOnly && resched !== null && (
          <div className="flex items-center gap-2 pt-1">
            <input type="datetime-local" value={resched} onChange={(e) => setResched(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#0e0e12] border border-white/10 text-xs text-white" />
            <button type="button" disabled={busy || !resched} className={btn}
              onClick={async () => {
                const d = new Date(resched);
                if (Number.isNaN(d.getTime())) { setErr('Fecha inválida.'); return; }
                if (await run('reschedule', () => callReschedule({ id: piece.id, scheduled_at: d.toISOString() }))) setResched(null);
              }}>Guardar</button>
            <button type="button" className={btn} onClick={() => setResched(null)}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
};
