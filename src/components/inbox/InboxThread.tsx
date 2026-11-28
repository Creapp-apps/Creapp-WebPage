import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Lightbulb } from 'lucide-react';
import { relativeTime } from '@/lib/contentTrackerView';
import {
  getInbox, postInboxMessage, markInboxRead, subscribeInbox,
  type InboxEntry, type InboxRole,
} from '@/lib/inboxService';

type Variant = 'admin' | 'portal';

const THEME: Record<Variant, {
  muted: string; empty: string; mine: string; theirs: string; name: string; body: string;
  input: string; button: string; error: string; sugg: string; suggTag: string; check: string;
}> = {
  admin: {
    muted: 'text-zinc-500',
    empty: 'text-zinc-500',
    mine: 'bg-indigo-500/15 border border-indigo-500/25 text-white',
    theirs: 'bg-white/5 border border-white/10 text-zinc-100',
    name: 'text-zinc-400',
    body: 'text-zinc-100',
    input: 'bg-white/[0.03] border border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50',
    button: 'bg-indigo-500 hover:bg-indigo-400 text-white',
    error: 'text-rose-400',
    sugg: 'bg-amber-500/10 border border-amber-500/30 text-amber-100',
    suggTag: 'text-amber-300',
    check: 'accent-indigo-500',
  },
  portal: {
    muted: 'text-[color:var(--muted)]',
    empty: 'text-[color:var(--muted)]',
    mine: 'bg-[color:var(--wood)]/20 border border-[color:var(--wood)]/40 text-[color:var(--ink)]',
    theirs: 'bg-white/5 border border-[color:var(--line)] text-[color:var(--ink)]',
    name: 'text-[color:var(--muted)]',
    body: 'text-[color:var(--ink)]',
    input: 'bg-white/5 border border-[color:var(--line)] text-[color:var(--ink)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--wood)]',
    button: 'bg-[color:var(--wood)] hover:bg-[color:var(--wood-deep)] text-white',
    error: 'text-rose-300',
    sugg: 'bg-[color:var(--wood)]/12 border border-[color:var(--wood)]/35 text-[color:var(--ink)]',
    suggTag: 'text-[color:var(--wood-light)]',
    check: 'accent-[color:var(--wood)]',
  },
};

type Props = {
  campaignId: string;
  role: InboxRole;
  variant?: Variant;
  /** Se llama al marcar leído, para que el badge del padre se apague. */
  onRead?: () => void;
};

export const InboxThread: React.FC<Props> = ({ campaignId, role, variant = 'admin', onRead }) => {
  const t = THEME[variant];
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [text, setText] = useState('');
  const [isSuggestion, setIsSuggestion] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reqId = useRef(0);

  const mark = useCallback(() => {
    markInboxRead(campaignId).then(() => onRead?.()).catch(() => { /* badge no crítico */ });
  }, [campaignId, onRead]);

  const reload = useCallback(async (silent = false) => {
    const id = ++reqId.current;
    try {
      const data = await getInbox(campaignId);
      if (id !== reqId.current) return;
      setEntries(data);
      setLoadErr(false);
      if (!silent) mark();
    } catch (e) {
      if (id !== reqId.current) return;
      console.error('Error cargando la bandeja:', e);
      setLoadErr(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [campaignId, mark]);

  useEffect(() => {
    setEntries([]);
    setLoadErr(false);
    setLoading(true);
    reload();
    const unsub = subscribeInbox(campaignId, () => { reload(); });
    return () => { reqId.current++; unsub(); };
  }, [campaignId, reload]);

  const send = async () => {
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    setErr(null);
    try {
      await postInboxMessage(campaignId, body, role, isSuggestion ? 'suggestion' : 'message');
      setText('');
      setIsSuggestion(false);
      reload(true);
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
        <div className={`flex items-center gap-1.5 text-[11px] ${t.muted}`}><Loader2 size={12} className="animate-spin" /> Cargando la bandeja…</div>
      ) : loadErr && entries.length === 0 ? (
        <p className={`text-xs ${t.error}`}>No pudimos cargar la bandeja.</p>
      ) : entries.length === 0 ? (
        <p className={`text-xs ${t.empty}`}>Todavía no hay mensajes. Escribí el primero.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e) => {
            const when = relativeTime(e.at);
            const fromTeam = e.authorRole === 'team';
            const name = e.authorName || (fromTeam ? 'Equipo' : 'Cliente');
            const mine = fromTeam === (role === 'team');
            const isSugg = e.kind === 'suggestion';
            return (
              <li key={e.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${isSugg ? t.sugg : mine ? t.mine : t.theirs}`}>
                  <div className={`text-[10px] font-semibold ${t.name}`}>{name}{when && ` · ${when}`}</div>
                  {isSugg && (
                    <div className={`mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${t.suggTag}`}>
                      <Lightbulb size={11} /> Sugerencia de pieza
                    </div>
                  )}
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
          aria-label="Escribí un mensaje"
          placeholder={role === 'client' ? 'Escribí un mensaje o sugerí una pieza…' : 'Escribí una respuesta…'}
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
      {role === 'client' && (
        <label className={`flex items-center gap-1.5 text-[11px] ${t.muted} cursor-pointer select-none`}>
          <input type="checkbox" checked={isSuggestion} onChange={(ev) => setIsSuggestion(ev.target.checked)} className={t.check} />
          Es una sugerencia de pieza
        </label>
      )}
      {err && <p className={`text-[11px] ${t.error}`}>{err}</p>}
    </div>
  );
};
