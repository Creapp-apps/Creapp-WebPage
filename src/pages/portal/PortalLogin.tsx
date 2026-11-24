import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { homePathForRole } from '@/lib/portalAccess';
import { AuthShell, fieldCls, labelCls, primaryBtnCls, ErrorBox } from './authShell';

// Si el cliente tilda "recordar", guardamos email+password en localStorage de SU
// equipo para autocompletar la próxima vez. Queda en texto plano en ese navegador.
const REMEMBER_KEY = 'creapp_portal_remember';

const PortalLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  // Prefill desde datos recordados.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data.email === 'string') {
        setEmail(data.email);
        if (typeof data.password === 'string') setPassword(data.password);
        setRemember(true);
      }
    } catch { /* localStorage no disponible */ }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { setError('Completá tu email y contraseña.'); return; }
    setLoading(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authError) {
        const code = (authError as { code?: string }).code ?? '';
        const notConfirmed = code === 'email_not_confirmed' || /not confirmed/i.test(authError.message);
        setError(notConfirmed
          ? 'Tu acceso todavía no está activado. Pedile a tu agencia que te reenvíe el acceso.'
          : 'Credenciales inválidas. Revisá tu email y contraseña.');
        setLoading(false); return;
      }
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: cleanEmail, password }));
        else localStorage.removeItem(REMEMBER_KEY);
      } catch { /* localStorage no disponible */ }
      navigate(homePathForRole('client'), { replace: true });
    } catch {
      setError('Ocurrió un error inesperado. Probá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Tu agencia te presenta"
      title="Ingresá a tu portal"
      subtitle="Acá ves tu campaña y las piezas listas para aprobar."
      footer={
        <>
          <button
            type="button"
            onClick={() => setForgot((v) => !v)}
            className="text-[13px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-white"
          >
            Olvidé mi contraseña
          </button>
          {forgot && (
            <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
              Pedile a tu agencia que te reenvíe la invitación y vas a poder crear una contraseña nueva.
            </p>
          )}
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-3">
        <div>
          <label className={labelCls} htmlFor="p-email">Email</label>
          <input id="p-email" type="email" autoComplete="email" className={fieldCls}
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="p-pass">Contraseña</label>
          <div className="relative">
            <input id="p-pass" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              className={`${fieldCls} pr-10`}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <label className="mt-1 flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-muted-foreground transition-colors hover:text-white">
          <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[5px] border border-white/20 bg-white/5 transition-colors checked:border-transparent checked:bg-gradient-to-br checked:from-primary checked:to-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            <Check size={12} strokeWidth={3.5} className="pointer-events-none hidden text-white peer-checked:block" />
          </span>
          Recordar mis datos
        </label>

        {error && <ErrorBox>{error}</ErrorBox>}

        <button type="submit" className={primaryBtnCls} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthShell>
  );
};

export default PortalLogin;
