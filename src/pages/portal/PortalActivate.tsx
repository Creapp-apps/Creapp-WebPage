import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { homePathForRole } from '@/lib/portalAccess';
import '@/components/portal/portal.css';
import { shell, card, input, label, button, errorBox } from './portalAuthStyles';

const MIN_LEN = 8;

const PortalActivate: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  // Solo true si ESTE montaje traía un token de invitación/recovery (no una sesión preexistente).
  const [consumedToken, setConsumedToken] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    let tokenPresent = false;
    (async () => {
      // El link del email trae el token en el hash; supabase-js crea la sesión temporal.
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = hashParams.get('error_code');
      if (code) {
        if (alive) {
          setError(code === 'otp_expired'
            ? 'El enlace venció o ya se usó. Pedile a tu agencia que te reenvíe la invitación.'
            : 'El enlace de activación no es válido.');
          setChecking(false);
        }
        return;
      }
      const tokenHash = new URLSearchParams(window.location.search).get('token_hash') || hashParams.get('token_hash');
      const hashType = hashParams.get('type');
      const hasToken = !!tokenHash || (!!hashParams.get('access_token') && (hashType === 'invite' || hashType === 'recovery'));
      tokenPresent = hasToken;
      if (tokenHash) {
        const type = (new URLSearchParams(window.location.search).get('type') || hashParams.get('type') || 'invite') as any;
        const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (vErr && alive) setError('El enlace venció o ya se usó. Pedile a tu agencia que te reenvíe la invitación.');
      }
      const { data } = await supabase.auth.getSession();
      if (alive) { setHasSession(!!data.session); setConsumedToken(tokenPresent && !!data.session); setChecking(false); }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive && session && tokenPresent) { setHasSession(true); setConsumedToken(true); setChecking(false); setError(''); }
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LEN) { setError(`La contraseña debe tener al menos ${MIN_LEN} caracteres.`); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true); setError('');
    const { error: upErr } = await supabase.auth.updateUser({ password });
    if (upErr) { setError(upErr.message || 'No pudimos guardar la contraseña.'); setSaving(false); return; }
    navigate(homePathForRole('client'), { replace: true });
  };

  return (
    <div className="portal" style={shell}>
      <form style={card} onSubmit={submit} noValidate>
        <div className="eyebrow">Tu agencia te presenta</div>
        <h1 className="serif" style={{ fontWeight: 500, fontSize: 30, margin: '12px 0 4px' }}>Creá tu contraseña</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Con esto activás tu acceso al portal de tu campaña.</p>

        {checking ? (
          <p style={{ color: 'var(--muted)', marginTop: 20 }}>Verificando tu invitación…</p>
        ) : hasSession && !consumedToken ? (
          <>
            <p style={{ color: 'var(--muted)', marginTop: 20 }}>Ya tenés una sesión abierta.</p>
            <button type="button" style={button} onClick={() => navigate('/portal')}>Ir a mi portal</button>
          </>
        ) : !hasSession ? (
          <>
            {error && <div role="alert" style={errorBox}>{error}</div>}
            <button type="button" style={button} onClick={() => navigate('/portal/login')}>Ir a ingresar</button>
          </>
        ) : (
          <>
            <label style={label} htmlFor="a-pass">Contraseña nueva</label>
            <input id="a-pass" type="password" autoComplete="new-password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} />
            <label style={label} htmlFor="a-conf">Repetí la contraseña</label>
            <input id="a-conf" type="password" autoComplete="new-password" style={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <div role="alert" style={errorBox}>{error}</div>}
            <button type="submit" style={{ ...button, opacity: saving ? 0.6 : 1 }} disabled={saving}>
              {saving ? 'Guardando…' : 'Activar mi acceso'}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default PortalActivate;
