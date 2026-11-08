import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TrackerCampaign } from '@/lib/contentTrackerTypes';
import { campaignProgress, sortPieces, plural } from '@/lib/contentTrackerView';
import { PieceStatusRow } from './PieceStatusRow';

export const CampaignGroup: React.FC<{ campaign: TrackerCampaign }> = ({ campaign }) => {
  const isActive = campaign.status === 'active';
  const [open, setOpen] = useState(isActive);
  const { approved, total } = campaignProgress(campaign);

  const drafts = campaign.pieces.filter((p) => !p.clientVisible).length;
  const sent = campaign.pieces.filter((p) => p.clientVisible);
  const nApproved = sent.filter((p) => p.status === 'approved').length;
  const nChanges = sent.filter((p) => p.status === 'changes_requested').length;
  const nPending = sent.filter((p) => p.status === 'sent').length;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left p-3.5 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {open ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
            <span className="text-sm font-semibold text-white truncate">{campaign.title || campaign.slug}</span>
            {campaign.month && <span className="text-xs text-zinc-500 shrink-0">· {campaign.month}</span>}
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            }`}
          >
            {isActive ? 'Vigente' : 'Cerrada'}
          </span>
        </div>

        {total > 0 ? (
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(approved / total) * 100}%` }} />
            </div>
            <span className="text-[11px] text-zinc-400 font-medium shrink-0">{approved}/{total} aprobadas</span>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500">Sin piezas enviadas</p>
        )}

        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          {nApproved > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{plural(nApproved, 'aprobada', 'aprobadas')}</span>}
          {nChanges > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25">{plural(nChanges, 'pidió cambios', 'pidieron cambios')}</span>}
          {nPending > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{nPending} sin revisar</span>}
          {drafts > 0 && <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{plural(drafts, 'en borrador', 'en borrador')}</span>}
        </div>
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2">
          {campaign.pieces.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">Esta campaña todavía no tiene piezas</p>
          ) : (
            sortPieces(campaign.pieces).map((p) => <PieceStatusRow key={p.id} piece={p} />)
          )}
        </div>
      )}
    </div>
  );
};
