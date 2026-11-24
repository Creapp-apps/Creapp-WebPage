import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { homePathForRole } from '@/lib/portalAccess';
import { AuthShell, fieldCls, labelCls, primaryBtnCls, ErrorBox } from './authShell';

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

  const secondaryBtnCls =
    'mt-4 w-full rounded-full border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10';

  return (
    <AuthShell
      eyebrow="Tu agencia te presenta"
      title="Creá tu contraseña"
      subtitle="Con esto activás tu acceso al portal de tu campaña."
    >
      {checking ? (
        <p className="text-center text-sm text-muted-foreground">Verificando tu invitación…</p>
      ) : hasSession && !consumedToken ? (
        <>
          <p className="text-center text-sm text-muted-foreground">Ya tenés una sesión abierta.</p>
          <button type="button" className={secondaryBtnCls} onClick={() => navigate('/portal')}>Ir a mi portal</button>
        </>
      ) : !hasSession ? (
        <>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="button" className={secondaryBtnCls} onClick={() => navigate('/portal/login')}>Ir a ingresar</button>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-3">
          <div>
            <label className={labelCls} htmlFor="a-pass">Contraseña nueva</label>
            <input id="a-pass" type="password" autoComplete="new-password" className={fieldCls}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="a-conf">Repetí la contraseña</label>
            <input id="a-conf" type="password" autoComplete="new-password" className={fieldCls}
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
          <button type="submit" className={primaryBtnCls} disabled={saving}>
            {saving ? 'Guardando…' : 'Activar mi acceso'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default PortalActivate;
