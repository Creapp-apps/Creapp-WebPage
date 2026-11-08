import React from 'react';
import { CheckCircle2, MessageSquareWarning, Clock, ImageOff } from 'lucide-react';
import type { TrackerPiece } from '@/lib/contentTrackerTypes';
import { STATUS_LABEL, relativeTime } from '@/lib/contentTrackerView';

const CHIP: Record<TrackerPiece['status'], { cls: string; Icon: React.ComponentType<{ size?: number }> }> = {
  sent: { cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20', Icon: Clock },
  approved: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircle2 },
  changes_requested: { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/25', Icon: MessageSquareWarning },
};

export const PieceStatusRow: React.FC<{ piece: TrackerPiece }> = ({ piece }) => {
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
          <span className="text-sm text-white font-medium truncate">{piece.title}</span>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
            <Icon size={11} />
            {STATUS_LABEL[piece.status]}
          </span>
        </div>
        {decided && piece.lastComment && (
          <p className="text-xs text-zinc-300 italic leading-relaxed">“{piece.lastComment}”</p>
        )}
        {decided && meta && <p className="text-[11px] text-zinc-500">{meta}</p>}
      </div>
    </div>
  );
};
