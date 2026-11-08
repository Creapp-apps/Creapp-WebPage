import React from 'react';
import type { TrackerClient } from '@/lib/contentTrackerTypes';
import { sortPieces, plural } from '@/lib/contentTrackerView';
import { PieceStatusRow } from './PieceStatusRow';

export const ClientCampaignCard: React.FC<{ client: TrackerClient }> = ({ client }) => {
  const { counts } = client;
  return (
    <section className="rounded-2xl bg-[#0e0e12] border border-white/5 p-5 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {client.logoUrl ? (
            <img src={client.logoUrl} alt={client.name} className="h-9 max-w-[140px] object-contain" />
          ) : (
            <h3 className="text-base font-bold text-white truncate">{client.name}</h3>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          {counts.approved > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{plural(counts.approved, 'aprobada', 'aprobadas')}</span>}
          {counts.changes > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25">{plural(counts.changes, 'pidió cambios', 'pidieron cambios')}</span>}
          {counts.pending > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{counts.pending} sin revisar</span>}
        </div>
      </header>
      {client.campaigns.map((camp) => (
        <div key={camp.id} className="space-y-2">
          {(camp.title || camp.month) && (
            <p className="text-xs text-zinc-400 font-medium">{[camp.title, camp.month].filter(Boolean).join(' · ')}</p>
          )}
          <div className="space-y-2">
            {sortPieces(camp.pieces).map((p) => <PieceStatusRow key={p.id} piece={p} />)}
          </div>
        </div>
      ))}
    </section>
  );
};
