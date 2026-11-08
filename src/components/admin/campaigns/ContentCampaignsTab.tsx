import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, Loader2 } from 'lucide-react';
import { getTrackerOverview, subscribeTracker } from '@/lib/contentTrackerService';
import type { TrackerOverview } from '@/lib/contentTrackerTypes';
import { sortClientsByUrgency, summaryText } from '@/lib/contentTrackerView';
import { ClientCampaignCard } from './ClientCampaignCard';

export const ContentCampaignsTab: React.FC = () => {
  const [overview, setOverview] = useState<TrackerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
  const clients = overview ? sortClientsByUrgency(overview.clients) : [];

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
      {!loading && overview && clients.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#0e0e12] p-10 text-center text-sm text-zinc-400">
          Todavía no enviaste campañas a ningún cliente.
        </div>
      )}
      {!loading && clients.map((c) => <ClientCampaignCard key={c.id} client={c} />)}
    </div>
  );
};

export default ContentCampaignsTab;
