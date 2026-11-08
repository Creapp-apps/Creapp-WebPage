import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, Loader2, Search } from 'lucide-react';
import { getTrackerOverview, subscribeTracker } from '@/lib/contentTrackerService';
import type { TrackerOverview } from '@/lib/contentTrackerTypes';
import { sortClientsByUrgency, summaryText } from '@/lib/contentTrackerView';
import { ClientCampaignCard } from './ClientCampaignCard';

export const ContentCampaignsTab: React.FC = () => {
  const [overview, setOverview] = useState<TrackerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const data = await getTrackerOverview();
      if (id !== reqId.current) return;
      setOverview(data);
      setError(false);
    } catch (err) {
      if (id !== reqId.current) return;
      console.error('Error cargando campañas:', err);
      setError(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeTracker(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { load(); }, 300);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [load]);

  const t = overview?.totals;
  const q = query.trim().toLowerCase();
  const filtered = overview
    ? overview.clients.filter(
        (c) =>
          (!q || c.name.toLowerCase().includes(q)) &&
          (!onlyPending || c.counts.changes > 0 || c.counts.pending > 0),
      )
    : [];
  const clients = sortClientsByUrgency(filtered);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-950/30 via-[#0e0e14] to-purple-950/20 border border-indigo-500/20 shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400"><Megaphone size={20} /></div>
            <h2 className="text-xl font-bold text-white tracking-tight">Campañas de Contenido</h2>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En vivo
          </span>
        </div>
        {t && (
          <p className="text-xs text-zinc-400">
            {summaryText(t)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0e0e12] border border-white/5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
          />
        </div>
        <button
          type="button"
          aria-pressed={onlyPending}
          onClick={() => setOnlyPending((v) => !v)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border ${onlyPending ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-[#0e0e12] text-zinc-400 border-white/5 hover:bg-white/5'}`}
        >
          Solo con pendientes
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500 text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando campañas…
        </div>
      )}
      {!loading && error && !overview && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300 text-center">
          No pudimos cargar las campañas. Probá de nuevo en un rato.
        </div>
      )}
      {!loading && overview && overview.clients.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#0e0e12] p-10 text-center text-sm text-zinc-400">
          Todavía no enviaste campañas a ningún cliente.
        </div>
      )}
      {!loading && overview && overview.clients.length > 0 && clients.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#0e0e12] p-8 text-center text-sm text-zinc-500">
          Ningún cliente coincide con el filtro.
        </div>
      )}
      {!loading && clients.map((c) => <ClientCampaignCard key={c.id} client={c} onChanged={load} />)}
    </div>
  );
};

export default ContentCampaignsTab;
