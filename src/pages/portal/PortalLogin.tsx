import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { homePathForRole } from '@/lib/portalAccess';
import { AuthShell, fieldCls, labelCls, primaryBtnCls, ErrorBox } from './authShell';

const PortalLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { setError('Completá tu email y contraseña.'); return; }
    setLoading(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authError) { setError('Credenciales inválidas. Revisá tu email y contraseña.'); setLoading(false); return; }
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
          <input id="p-pass" type="password" autoComplete="current-password" className={fieldCls}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <ErrorBox>{error}</ErrorBox>}

        <button type="submit" className={primaryBtnCls} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthShell>
  );
};

export default PortalLogin;
