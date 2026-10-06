import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { supabase } from '@/lib/supabaseClient';
import { AuthForm } from '@/components/ui/sign-in-1';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Por favor completá todos los campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        setError('Credenciales inválidas. Verificá tu email y contraseña.');
        setLoading(false);
        return;
      }

      navigate('/admin');
    } catch {
      setError('Ocurrió un error inesperado al iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background-dark flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <AuthForm
            logoSrc={creappLogoOfficial}
            logoAlt="CreAPP Software Lab"
            title="Panel Admin"
            description="Acceso al gestor y cotizador de CreAPP"
            className="w-full"
            primaryAction={{
              label: loading ? "Iniciando sesión..." : "Iniciar Sesión",
              type: "submit",
              disabled: loading,
              icon: loading ? (
                <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              ),
              className: "bg-gradient-to-r from-primary to-secondary text-white font-bold tracking-wide shadow-lg shadow-primary/20",
            }}
            skipAction={{
              label: "Volver a CreAPP Web",
              onClick: () => navigate('/'),
            }}
            footerContent={
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  ¿Necesitás acceso? Contactá al equipo de soporte de{" "}
                  <span className="text-primary font-medium">CreAPP Lab</span>.
                </p>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                  v2.5 • Fintech & Software Innovation Hub
                </p>
              </div>
            }
          >
            {/* Custom Credentials Form Fields */}
            <div className="grid gap-3 mb-2">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@creapp.com.ar"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>
          </AuthForm>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
