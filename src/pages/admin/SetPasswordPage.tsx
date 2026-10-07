import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  KeyRound,
  Play,
  RotateCcw,
  Sliders,
  ExternalLink,
  Shield,
  Briefcase,
} from 'lucide-react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export const SetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshProfile } = useAuth();

  // Modo simulación / sandbox
  const isPreview = searchParams.get('preview') === 'true' || searchParams.get('demo') === 'true';
  const [simulatedRole, setSimulatedRole] = useState<'admin' | 'vendedor'>(
    (searchParams.get('role') as any) || 'admin'
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(
    isPreview ? searchParams.get('email') || 'nuevo.miembro@creapp.com.ar' : null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(!isPreview);

  useEffect(() => {
    let isMounted = true;

    // Si estamos en modo simulación, no interferir con la sesión real de Supabase
    if (isPreview) {
      setUserEmail(searchParams.get('email') || 'nuevo.miembro@creapp.com.ar');
      setIsCheckingSession(false);
      return;
    }

    const initAuth = async () => {
      // 1. Extraer parámetros tanto de query (?token_hash=...) como de hash (#token_hash=...)
      const currentSearchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const tokenHash = currentSearchParams.get('token_hash') || hashParams.get('token_hash');
      const otpType = currentSearchParams.get('type') || hashParams.get('type') || 'invite';

      // 2. Si viene un token_hash directo (método inmune a bots de escaneo de correo)
      if (tokenHash) {
        try {
          // Limpiar cualquier sesión previa en localStorage para evitar mezclar cuentas en el mismo navegador
          await supabase.auth.signOut().catch(() => {});

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any,
          });

          if (verifyError) {
            if (isMounted) {
              setUserEmail(null);
              setError(
                verifyError.message.includes('expired')
                  ? 'El enlace de invitación o activación ha expirado o ya fue utilizado.'
                  : verifyError.message
              );
              setIsCheckingSession(false);
            }
            return;
          }

          if (isMounted && data.user) {
            setUserEmail(data.user.email || null);
            setError(null);
            setIsCheckingSession(false);
            return;
          }
        } catch (err: any) {
          console.error('Error al verificar OTP:', err);
          if (isMounted) {
            setUserEmail(null);
            setError(err.message || 'Error al validar el token de invitación.');
            setIsCheckingSession(false);
          }
          return;
        }
      }

      // 3. Revisar si hay error en la URL hash (ej: enlace expirado vía verify estándar)
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');

      if (errorCode || errorDescription) {
        if (isMounted) {
          setUserEmail(null);
          setError(
            errorCode === 'otp_expired'
              ? 'El enlace de invitación o activación ha expirado o ya fue utilizado.'
              : errorDescription?.replace(/\+/g, ' ') || 'El enlace de activación no es válido.'
          );
          setIsCheckingSession(false);
        }
        return;
      }

      // 4. Revisar si ya existe sesión activa
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          if (isMounted) {
            setUserEmail(session.user.email || null);
            setIsCheckingSession(false);
          }
        } else {
          // Breve espera para que Supabase procese fragmentos de hash (#access_token=...)
          const timeout = setTimeout(async () => {
            const { data: { session: delayedSession } } = await supabase.auth.getSession();
            if (isMounted) {
              if (delayedSession?.user) {
                setUserEmail(delayedSession.user.email || null);
              }
              setIsCheckingSession(false);
            }
          }, 1200);

          return () => clearTimeout(timeout);
        }
      } catch (err) {
        console.error('Error in SetPasswordPage session check:', err);
        if (isMounted) setIsCheckingSession(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted || isPreview) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session?.user) {
        setUserEmail(session?.user?.email || null);
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isPreview, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verificá que sean iguales.');
      return;
    }

    setLoading(true);

    // Modo simulación: efecto visual interactivo sin tocar la base de datos
    if (isPreview) {
      setTimeout(() => {
        setLoading(false);
        setIsSuccess(true);
      }, 1200);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
      if (refreshProfile) {
        await refreshProfile().catch(() => {});
      }

      setTimeout(() => {
        navigate('/admin');
      }, 2200);
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setError(err.message || 'No se pudo definir la contraseña. Verificá tu sesión o el enlace.');
    } finally {
      setLoading(false);
    }
  };

  // Controles del simulador
  const handleSimulateState = (state: 'normal' | 'success' | 'expired') => {
    if (state === 'normal') {
      setIsSuccess(false);
      setError(null);
      setPassword('');
      setConfirmPassword('');
    } else if (state === 'success') {
      setIsSuccess(true);
      setError(null);
    } else if (state === 'expired') {
      setIsSuccess(false);
      setError('El enlace de invitación o activación ha expirado o ya fue utilizado.');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#05070B] text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Luces de fondo y resplandor atmosférico */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-pink-500/10 rounded-full blur-[160px]" />
      </div>

      {/* Barra superior de simulación activa */}
      {isPreview && (
        <div className="relative z-20 mb-6 flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-2xl bg-purple-950/60 border border-purple-500/30 backdrop-blur-md shadow-lg text-xs">
          <div className="flex items-center gap-2 font-mono text-purple-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">Modo Simulación & Sandbox</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-400 text-[11px]">
            Podés probar las interacciones visuales sin alterar ningún usuario real.
          </span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md bg-[#0B101B]/95 border border-white/10 backdrop-blur-xl rounded-3xl p-7 sm:p-9 shadow-2xl overflow-hidden flex flex-col gap-6"
      >
        {/* Barra superior con gradiente de marca */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400" />

        {/* Encabezado con Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 blur group-hover:opacity-60 transition duration-500" />
            <div className="relative w-14 h-14 rounded-2xl bg-[#121622] border border-white/10 flex items-center justify-center p-2.5 shadow-xl">
              <img
                src={creappLogoOfficial}
                alt="CreAPP Software Lab"
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-mono font-medium tracking-wide">
              <Sparkles size={12} className="text-purple-400" />
              <span>ACTIVACIÓN DE CUENTA</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Definir tu Contraseña
            </h1>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Establecé una contraseña segura y personal para ingresar a CreAPP OS.
            </p>
          </div>

          {/* Email badge con indicador de rol */}
          {userEmail && (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300">
              <Mail size={13} className="text-purple-400" />
              <span className="font-mono text-[11px] text-zinc-200">{userEmail}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                {simulatedRole === 'admin' ? 'Master Admin' : 'Vendedor'}
              </span>
            </div>
          )}
        </div>

        {/* Notificaciones de error */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed"
            >
              <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('expirado') && (
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => navigate('/admin/login')}
                      className="text-white underline font-semibold hover:text-rose-200 transition-colors"
                    >
                      Ir al inicio de sesión
                    </button>
                    {isPreview && (
                      <button
                        onClick={() => handleSimulateState('normal')}
                        className="text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300 hover:text-white"
                      >
                        Reiniciar error
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estado: Éxito */}
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-6 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">¡Contraseña Activada con Éxito!</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Tu cuenta ha sido configurada. Redirigiéndote al Centro de Operaciones...
              </p>
            </div>

            {isPreview ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSimulateState('normal')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all"
                >
                  <RotateCcw size={13} />
                  <span>Probar Otra Vez el Formulario</span>
                </button>
              </div>
            ) : (
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mt-2" />
            )}
          </motion.div>
        ) : (
          /* Formulario */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} />
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={12} />
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Repetí la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Checklist de requerimientos visual */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] transition-colors ${
                    password.length >= 6
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-zinc-500'
                  }`}
                >
                  ✓
                </div>
                <span className={password.length >= 6 ? 'text-zinc-300' : 'text-zinc-500'}>
                  Al menos 6 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] transition-colors ${
                    confirmPassword && password === confirmPassword
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-zinc-500'
                  }`}
                >
                  ✓
                </div>
                <span
                  className={
                    confirmPassword && password === confirmPassword
                      ? 'text-zinc-300'
                      : 'text-zinc-500'
                  }
                >
                  Las contraseñas coinciden
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              className="w-full mt-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-purple-600/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando Contraseña...</span>
                </>
              ) : (
                <>
                  <span>Activar y Entrar a CreAPP OS</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/5 text-center flex items-center justify-between text-[11px] text-zinc-500">
          <span>CreAPP Innovation Hub</span>
          <span>Software Innovation Lab</span>
        </div>
      </motion.div>

      {/* Control flotante inferior para diseñar y auditar estados */}
      {isPreview && (
        <div className="relative z-20 mt-6 flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-[#0B101B]/90 border border-white/10 backdrop-blur-md text-xs shadow-2xl">
          <span className="text-[11px] font-mono text-zinc-400 px-2 flex items-center gap-1.5">
            <Sliders size={13} className="text-purple-400" />
            Simular Estado:
          </span>
          <button
            type="button"
            onClick={() => handleSimulateState('normal')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              !isSuccess && !error
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            Formulario
          </button>
          <button
            type="button"
            onClick={() => handleSimulateState('success')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              isSuccess
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            Pantalla Éxito
          </button>
          <button
            type="button"
            onClick={() => handleSimulateState('expired')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              error
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            Token Expirado
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={() =>
              setSimulatedRole(simulatedRole === 'admin' ? 'vendedor' : 'admin')
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 text-xs transition-all"
            title="Cambiar rol simulado"
          >
            {simulatedRole === 'admin' ? (
              <Shield size={13} className="text-purple-400" />
            ) : (
              <Briefcase size={13} className="text-blue-400" />
            )}
            <span>Rol: {simulatedRole === 'admin' ? 'Master Admin' : 'Vendedor'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs transition-all"
          >
            <ExternalLink size={12} />
            <span>Volver a /admin</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SetPasswordPage;
