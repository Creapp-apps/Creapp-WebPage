import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, MessageSquareWarning } from 'lucide-react';
import type { ThreadEntry } from '@/lib/threadTypes';
import { getThread, postTeamMessage, postClientMessage, subscribeThread } from '@/lib/threadService';
import { relativeTime } from '@/lib/contentTrackerView';

type Variant = 'admin' | 'portal';

const THEME: Record<Variant, {
  muted: string; empty: string; mine: string; theirs: string; name: string; body: string;
  approved: string; changes: string; input: string; button: string; error: string;
}> = {
  admin: {
    muted: 'text-zinc-500',
    empty: 'text-zinc-500',
    mine: 'bg-indigo-500/15 border border-indigo-500/25 text-white',
    theirs: 'bg-white/5 border border-white/10 text-zinc-100',
    name: 'text-zinc-400',
    body: 'text-zinc-100',
    approved: 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300',
    changes: 'bg-rose-500/10 border border-rose-500/25 text-rose-300',
    input: 'bg-white/[0.03] border border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50',
    button: 'bg-indigo-500 hover:bg-indigo-400 text-white',
    error: 'text-rose-400',
  },
  portal: {
    muted: 'text-[color:var(--muted)]',
    empty: 'text-[color:var(--muted)]',
    mine: 'bg-[color:var(--wood)]/20 border border-[color:var(--wood)]/40 text-[color:var(--ink)]',
    theirs: 'bg-white/5 border border-[color:var(--line)] text-[color:var(--ink)]',
    name: 'text-[color:var(--muted)]',
    body: 'text-[color:var(--ink)]',
    approved: 'bg-[color:var(--ok)]/10 border border-[color:var(--ok)]/30 text-[color:var(--ok)]',
    changes: 'bg-rose-500/10 border border-rose-400/30 text-rose-300',
    input: 'bg-white/5 border border-[color:var(--line)] text-[color:var(--ink)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--wood)]',
    button: 'bg-[color:var(--wood)] hover:bg-[color:var(--wood-deep)] text-white',
    error: 'text-rose-300',
  },
};

export const PieceThread: React.FC<{ jobId: string; mode: 'team' | 'client'; variant?: Variant }> = ({
  jobId, mode, variant = 'admin',
}) => {
  const t = THEME[variant];
  const [entries, setEntries] = useState<ThreadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setEntries(await getThread(jobId));
    } catch (e) {
      console.error('Error cargando hilo:', e);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    reload();
    const unsub = subscribeThread(jobId, () => { reload(); });
    return () => { unsub(); };
  }, [jobId, reload]);

  const send = async () => {
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    setErr(null);
    try {
      if (mode === 'team') await postTeamMessage(jobId, body);
      else await postClientMessage(jobId, body);
      setText('');
      reload();
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      setErr('No se pudo enviar el mensaje. Probá de nuevo.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <div className={`flex items-center gap-1.5 text-[11px] ${t.muted}`}><Loader2 size={12} className="animate-spin" /> Cargando conversación…</div>
      ) : entries.length === 0 ? (
        <p className={`text-xs ${t.empty}`}>Todavía no hay mensajes. Escribí el primero.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e) => {
            const when = relativeTime(e.at);
            if (e.kind === 'decision') {
              const ok = e.decision === 'approved';
              return (
                <li key={e.id} className={`rounded-lg px-3 py-2 text-xs ${ok ? t.approved : t.changes}`}>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {ok ? <CheckCircle2 size={12} /> : <MessageSquareWarning size={12} />}
                    {ok ? 'Aprobó la pieza' : 'Pidió cambios'}
                    {when && <span className="font-normal opacity-70">· {when}</span>}
                  </div>
                  {!ok && e.body && <p className="mt-1 leading-relaxed">{e.body}</p>}
                </li>
              );
            }
            const fromTeam = e.authorRole === 'team';
            const name = e.authorName || (fromTeam ? 'Equipo' : 'Cliente');
            const mine = fromTeam === (mode === 'team');
            return (
              <li key={e.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${mine ? t.mine : t.theirs}`}>
                  <div className={`text-[10px] font-semibold ${t.name}`}>{name}{when && ` · ${when}`}</div>
                  <p className={`mt-0.5 leading-relaxed whitespace-pre-wrap ${t.body}`}>{e.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          rows={2}
          placeholder="Escribí un mensaje…"
          className={`flex-1 resize-none rounded-lg px-3 py-2 text-xs outline-none ${t.input}`}
        />
        <button
          type="button"
          onClick={send}
          disabled={posting || !text.trim()}
          className={`px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${t.button}`}
        >
          {posting ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      {err && <p className={`text-[11px] ${t.error}`}>{err}</p>}
    </div>
  );
};
