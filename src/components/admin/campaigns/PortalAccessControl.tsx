import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { getClientAccess, invitePortalClient, type ClientAccessStatus } from '@/lib/portalOnboardingService';

const CHIP: Record<ClientAccessStatus, { label: string; cls: string }> = {
  none: { label: 'Sin alta', cls: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/25' },
  invited: { label: 'Invitado', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  active: { label: 'Activo', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

const ERRORS: Record<string, string> = {
  email_is_team: 'Ese email ya pertenece al equipo, no se puede dar de alta como cliente.',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PortalAccessControl: React.FC<{ clientId: string; brandName: string }> = ({ clientId, brandName }) => {
  const [status, setStatus] = useState<ClientAccessStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const a = await getClientAccess(clientId);
      setStatus(a.status);
      return a;
    } catch {
      setStatus(null);
      return null;
    }
  }, [clientId]);

  useEffect(() => { refresh(); }, [refresh]);

  const valid = EMAIL_RE.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setMsg(null);
    const sentTo = email.trim();
    const r = await invitePortalClient({ clientId, brandName, email: sentTo, fullName: fullName.trim() || undefined });
    setBusy(false);
    if (r.success) {
      setMsg({ ok: true, text: `Le enviamos el acceso a ${sentTo}` });
      setOpen(false); setEmail(''); setFullName('');
      refresh();
    } else {
      setMsg({ ok: false, text: ERRORS[r.error ?? ''] ?? r.error ?? 'No se pudo enviar el acceso.' });
    }
  };

  const chip = status ? CHIP[status] : null;
  const input = 'px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
        <span className={`px-2 py-0.5 rounded-full border ${chip ? chip.cls : 'bg-white/5 text-zinc-500 border-white/10'}`}>
          {chip ? chip.label : 'Cargando…'}
        </span>
        <button type="button" disabled={status === null || busy} onClick={() => { setOpen((o) => !o); setMsg(null); }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50">
          <KeyRound size={12} /> {status === 'none' ? 'Dar de alta al portal' : 'Reenviar acceso'}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email del cliente" className={`${input} w-52`} />
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre de contacto (opcional)" className={`${input} w-52`} />
          <button type="submit" disabled={!valid || busy}
            className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold disabled:opacity-40">
            {busy ? 'Enviando…' : 'Enviar acceso'}
          </button>
        </form>
      )}
      {msg && <p role="status" className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
    </div>
  );
};
