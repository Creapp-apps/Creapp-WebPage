import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Loader2, Play, ScrollText } from 'lucide-react';
import { computeCronHealth } from '@/lib/launchesView';
import { callRunTick, fetchCronLogs } from '@/lib/launchesService';
import type { LaunchesOverview } from '@/lib/launchesTypes';
import { RunTickConfirm } from './RunTickConfirm';

const errMsg = (e: unknown): string => {
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : 'Error inesperado';
};

interface Props {
  overview: LaunchesOverview;
  readOnly: boolean;
  onChanged: () => void;
}

export const HealthBanner: React.FC<Props> = ({ overview, readOnly, onChanged }) => {
  const health = useMemo(() => computeCronHealth(overview.cronRuns, new Date()), [overview]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [logsBusy, setLogsBusy] = useState(false);

  const ok = health.state === 'ok';
  const deploy = overview.deployEvents[0];
  const deploymentId = deploy?.deployment_id ?? overview.cronRuns[0]?.deployment_id ?? null;
  const infraErrors = overview.logEvents.filter((l) => l.level === 'error' || l.level === 'fatal').slice(0, 3);

  const label =
    health.state === 'ok' ? `Cron OK · última corrida hace ${health.ageMin} min`
    : health.state === 'down' ? 'Cron caído · sin corridas registradas'
    : health.state === 'stale' ? `Cron caído · sin corrida OK hace ${health.ageMin ?? '—'} min`
    : 'Cron con error en la última corrida';

  const runTick = async () => {
    setBusy(true); setMsg(null);
    try {
      await callRunTick({});
      setMsg({ ok: true, text: 'Tick ejecutado.' });
      setConfirm(false);
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  const showLogs = async () => {
    if (!deploymentId) { setLogs('Sin deployment para consultar.'); return; }
    setLogsBusy(true);
    try {
      setLogs(JSON.stringify(await fetchCronLogs(deploymentId), null, 2));
    } catch (e) {
      setLogs(errMsg(e));
    } finally {
      setLogsBusy(false);
    }
  };

  return (
    <div className={`rounded-3xl p-5 border space-y-3 ${ok ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-rose-950/20 border-rose-500/30'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {ok ? <Activity size={18} /> : <AlertTriangle size={18} />}
          </div>
          <span className={`text-sm font-bold ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={showLogs} disabled={logsBusy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-50">
            {logsBusy ? <Loader2 size={12} className="animate-spin" /> : <ScrollText size={12} />} Ver logs del tick
          </button>
          {!readOnly && (
            <button type="button" onClick={() => setConfirm(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25">
              <Play size={12} /> Correr tick ahora
            </button>
          )}
        </div>
      </div>
      <div className="text-xs text-zinc-400">
        Deploy actual: {deploy ? <><span className="font-mono text-zinc-300">{(deploy.git_sha ?? '—').slice(0, 7)}</span> · {deploy.state ?? deploy.type ?? '—'}</> : 'sin datos'}
        {overview.healthErrors.length > 0 && <span className="text-amber-400"> · no se pudo leer: {overview.healthErrors.join(', ')}</span>}
      </div>
      {infraErrors.length > 0 && (
        <ul className="text-[11px] text-rose-300/90 space-y-0.5">
          {infraErrors.map((l) => <li key={l.id} className="truncate">• {l.message ?? 'error sin mensaje'}</li>)}
        </ul>
      )}
      {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
      {logs && (
        <pre className="max-h-64 overflow-auto rounded-xl bg-black/40 border border-white/5 p-3 text-[11px] text-zinc-300 whitespace-pre-wrap">{logs}</pre>
      )}
      {confirm && <RunTickConfirm pieces={overview.pieces} busy={busy} onConfirm={runTick} onCancel={() => setConfirm(false)} />}
    </div>
  );
};
