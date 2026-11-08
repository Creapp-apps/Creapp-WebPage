import React, { useState } from 'react';
import { CheckCircle2, MessageSquareWarning, Clock, ImageOff, Film, Send, Undo2, ExternalLink } from 'lucide-react';
import { sendPiece, unpublishPiece } from '@/lib/contentTrackerService';
import { motorStudio } from '@/lib/motorStudio';
import type { TrackerPiece } from '@/lib/contentTrackerTypes';
import { STATUS_LABEL, relativeTime, pieceTitle } from '@/lib/contentTrackerView';

const CHIP: Record<TrackerPiece['status'], { cls: string; Icon: React.ComponentType<{ size?: number }> }> = {
  sent: { cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20', Icon: Clock },
  approved: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircle2 },
  changes_requested: { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/25', Icon: MessageSquareWarning },
};

const STAGE_LABEL: Record<string, string> = {
  guion: 'Guion', voz: 'Voz', broll: 'B-roll', render: 'Render', qa: 'QA',
  listo: 'Listo',
};

export const PieceStatusRow: React.FC<{ piece: TrackerPiece; onChanged: () => void }> = ({ piece, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      console.error('Error en acción de pieza:', e);
      setErr('No se pudo completar la acción. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  };
  const stage = piece.productionStage ? (STAGE_LABEL[piece.productionStage] ?? null) : null;
  const btn = 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed';
  const { cls, Icon } = CHIP[piece.status];
  const decided = piece.status !== 'sent';
  const when = relativeTime(piece.lastDecisionAt);
  const meta = [piece.lastDecisionBy, when].filter(Boolean).join(' · ');
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shrink-0 flex items-center justify-center text-zinc-600">
        {piece.coverUrl ? (
          <img src={piece.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageOff size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-white font-medium truncate">{pieceTitle(piece)}</span>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
            <Icon size={11} />
            {STATUS_LABEL[piece.status]}
          </span>
        </div>
        {decided && piece.lastComment && (
          <p className="text-xs text-zinc-300 italic leading-relaxed">“{piece.lastComment}”</p>
        )}
        {decided && meta && <p className="text-[11px] text-zinc-500">{meta}</p>}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold pt-0.5">
          <span className={`px-2 py-0.5 rounded-full border ${piece.clientVisible ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
            {piece.clientVisible ? 'Enviada' : 'Borrador'}
          </span>
          {stage && <span className="px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-300 border-zinc-500/20">{stage}</span>}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${piece.rendered ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}>
            <Film size={11} />
            {piece.rendered ? 'Renderizada' : 'Sin render'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {!piece.clientVisible && (
            <button type="button" disabled={busy} onClick={() => run(() => sendPiece(piece.id))} className={btn}>
              <Send size={11} /> Enviar al cliente
            </button>
          )}
          {piece.clientVisible && (
            <button type="button" disabled={busy} onClick={() => run(() => unpublishPiece(piece.id))} className={btn}>
              <Undo2 size={11} /> Despublicar
            </button>
          )}
          {piece.jobIdMotor && (
            <button type="button" onClick={() => window.open(motorStudio(piece.jobIdMotor), '_blank', 'noopener')} className={btn}>
              <ExternalLink size={11} /> Abrir en Estudio
            </button>
          )}
        </div>
        {err && <p className="text-[11px] text-rose-400">{err}</p>}
      </div>
    </div>
  );
};
