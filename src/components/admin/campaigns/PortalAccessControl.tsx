import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { getClientAccess, getPortalCredential, invitePortalClient, setClientPassword, type ClientAccessStatus } from '@/lib/portalOnboardingService';

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
  const [confirmPw, setConfirmPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwResult, setPwResult] = useState<{ password: string; email: string | null } | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [stored, setStored] = useState<{ password: string; email: string | null; updatedAt: string } | null>(null);
  const [reveal, setReveal] = useState(false);
  const [storedCopied, setStoredCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const a = await getClientAccess(clientId);
      setStatus(a.status);
      setClientEmail(a.email);
      getPortalCredential(clientId).then(setStored).catch(() => setStored(null));
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

  const runSetPassword = async () => {
    if (pwBusy) return;
    setPwBusy(true);
    setPwError(null);
    setPwResult(null);
    const r = await setClientPassword(clientId);
    setPwBusy(false);
    setConfirmPw(false);
    if (r.success && r.password) {
      setPwResult({ password: r.password, email: r.email ?? null });
      setStored({ password: r.password, email: r.email ?? null, updatedAt: new Date().toISOString() });
    } else {
      setPwError(r.error ?? 'No se pudo generar la contraseña.');
    }
  };

  const copyPassword = async () => {
    if (!pwResult) return;
    try {
      await navigator.clipboard.writeText(pwResult.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setPwError('No se pudo copiar. Seleccioná y copiá a mano.');
    }
  };

  const copyStored = async () => {
    if (!stored) return;
    try {
      await navigator.clipboard.writeText(stored.password);
      setStoredCopied(true);
      setTimeout(() => setStoredCopied(false), 2000);
    } catch { /* clipboard bloqueado: el usuario puede seleccionar a mano */ }
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
        {status && status !== 'none' && (
          <button type="button" disabled={pwBusy} onClick={() => { setConfirmPw((c) => !c); setPwResult(null); setPwError(null); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition-colors disabled:opacity-50">
            <ShieldAlert size={12} /> Generar clave
          </button>
        )}
      </div>
      {(clientEmail || stored) && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/10">
          {clientEmail && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-500 w-20 shrink-0">Email</span>
              <code className="flex-1 min-w-0 font-mono text-white truncate select-all">{clientEmail}</code>
            </div>
          )}
          {stored ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-500 w-20 shrink-0">Última clave</span>
              <code className="flex-1 min-w-0 px-2 py-1 rounded bg-black/40 border border-white/10 font-mono text-white tracking-wide truncate select-all">
                {reveal ? stored.password : '••••••••••••'}
              </code>
              <button type="button" onClick={() => setReveal((v) => !v)} title={reveal ? 'Ocultar' : 'Ver'}
                className="p-1 rounded hover:bg-white/10 text-zinc-300 shrink-0">
                {reveal ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button type="button" onClick={copyStored} title="Copiar"
                className="p-1 rounded hover:bg-white/10 text-zinc-300 shrink-0">
                {storedCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          ) : (
            status && status !== 'none' && (
              <p className="text-[10.5px] text-zinc-500">Sin clave generada todavía. Usá "Generar clave" para crear una y guardarla acá.</p>
            )
          )}
          {stored && (
            <p className="text-[10px] text-zinc-600">Última que generaste. Si el cliente la cambió al activar, esta queda vieja.</p>
          )}
        </div>
      )}
      {confirmPw && (
        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Esto genera una contraseña nueva para el cliente e <strong>invalida la que tenga ahora</strong>. Usalo solo si perdió el acceso y no le llega el email. Después se la pasás vos.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pwBusy} onClick={runSetPassword}
              className="px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-semibold disabled:opacity-40">
              {pwBusy ? 'Generando…' : 'Sí, generar clave nueva'}
            </button>
            <button type="button" disabled={pwBusy} onClick={() => setConfirmPw(false)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 border border-white/10 text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {pwResult && (
        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <p className="text-[11px] text-emerald-300/90">
            Clave nueva{pwResult.email ? ` de ${pwResult.email}` : ''}. Copiala ahora: no se vuelve a mostrar.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white tracking-wide select-all">
              {pwResult.password}
            </code>
            <button type="button" onClick={copyPassword}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold">
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
        </div>
      )}
      {pwError && <p role="status" className="text-xs text-rose-400">{pwError}</p>}
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
