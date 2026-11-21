import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Rocket } from 'lucide-react';
import { getLaunchesOverview, subscribeLaunches } from '@/lib/launchesService';
import type { LaunchesOverview } from '@/lib/launchesTypes';
import { HealthBanner } from './HealthBanner';
import { LaunchRow, STATUS_LABEL } from './LaunchRow';

export const LaunchesTab: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const [overview, setOverview] = useState<LaunchesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [client, setClient] = useState('all');
  const [status, setStatus] = useState('all');

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const data = await getLaunchesOverview();
      if (id !== reqId.current) return;
      setOverview(data);
      setError(false);
    } catch (err) {
      if (id !== reqId.current) return;
      console.error('Error cargando lanzamientos:', err);
      setError(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeLaunches(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { load(); }, 300);
    });
    return () => { if (timer) clearTimeout(timer); unsub(); };
  }, [load]);

  const pieces = overview?.pieces ?? [];
  const clients = Array.from(new Set(pieces.map((p) => p.clientName))).sort();
  const statuses = Array.from(new Set(pieces.map((p) => p.status)));
  const shown = pieces.filter((p) => (client === 'all' || p.clientName === client) && (status === 'all' || p.status === status));
  const sel = 'px-3 py-2 rounded-xl bg-[#0e0e12] border border-white/5 text-sm text-white focus:outline-none focus:border-indigo-500/40';

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-950/30 via-[#0e0e14] to-purple-950/20 border border-indigo-500/20 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400"><Rocket size={20} /></div>
          <h2 className="text-xl font-bold text-white tracking-tight">Lanzamientos</h2>
          {readOnly && <span className="text-[11px] text-zinc-500">solo lectura</span>}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500 text-sm">
          <Loader2 size={16} className="animate-spin" /> Cargando lanzamientos…
        </div>
      )}
      {!loading && error && !overview && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300 text-center">
          No pudimos cargar los lanzamientos. Probá de nuevo en un rato.
        </div>
      )}
      {overview && (
        <>
          {error && <p className="text-xs text-amber-400">No se pudo actualizar; mostrando datos anteriores.</p>}
          <HealthBanner overview={overview} readOnly={readOnly} onChanged={load} />
          <div className="flex flex-wrap items-center gap-3">
            <select value={client} onChange={(e) => setClient(e.target.value)} className={sel} aria-label="Cliente">
              <option value="all">Todos los clientes</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel} aria-label="Estado">
              <option value="all">Todos los estados</option>
              {statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
            </select>
          </div>
          {shown.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0e0e12] p-10 text-center text-sm text-zinc-400">
              No hay lanzamientos para este filtro.
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((p) => <LaunchRow key={p.id} piece={p} readOnly={readOnly} onChanged={load} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LaunchesTab;
