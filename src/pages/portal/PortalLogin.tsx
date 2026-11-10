import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { homePathForRole } from '@/lib/portalAccess';
import '@/components/portal/portal.css';
import { shell, card, input, label, button, errorBox } from './portalAuthStyles';

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
    <div className="portal" style={shell}>
      <form style={card} onSubmit={submit} noValidate>
        <div className="eyebrow">Tu agencia te presenta</div>
        <h1 className="serif" style={{ fontWeight: 500, fontSize: 30, margin: '12px 0 4px' }}>Ingresá a tu portal</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Acá ves tu campaña y las piezas listas para aprobar.</p>

        <label style={label} htmlFor="p-email">Email</label>
        <input id="p-email" type="email" autoComplete="email" style={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label style={label} htmlFor="p-pass">Contraseña</label>
        <input id="p-pass" type="password" autoComplete="current-password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div role="alert" style={errorBox}>{error}</div>}
        <button type="submit" style={{ ...button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <button type="button" onClick={() => setForgot((v) => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, marginTop: 16, cursor: 'pointer', textDecoration: 'underline' }}>
          Olvidé mi contraseña
        </button>
        {forgot && (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 0' }}>
            Pedile a tu agencia que te reenvíe la invitación y vas a poder crear una contraseña nueva.
          </p>
        )}
      </form>
    </div>
  );
};

export default PortalLogin;
