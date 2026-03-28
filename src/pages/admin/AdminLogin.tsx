import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
      setLoading(false);
      return;
    }

    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Migration Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 px-5 py-3 mb-8 rounded-2xl bg-emerald-500/15 border border-emerald-500/30"
        >
          <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
          <p className="text-emerald-300 text-sm font-bold">
            ✅ Migración correcta — Repo transferido exitosamente entre cuentas de GitHub.
          </p>
        </motion.div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
            <Rocket className="text-white fill-current" size={24} />
          </div>
          <div className="flex items-baseline italic">
            <span className="text-3xl font-black tracking-tighter text-white">cre</span>
            <span className="text-3xl font-black tracking-tighter text-primary">app</span>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-[2rem] p-10 shadow-2xl">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider mb-2">Panel Admin</h1>
            <p className="text-sm text-slate-500 font-light">Acceso al gestor de propuestas comerciales</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase tracking-widest font-bold block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@creapp.com.ar"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase tracking-widest font-bold block">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Iniciar Sesión <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-700 text-[10px] uppercase tracking-[0.5em] font-black mt-10">
          CreAPP Lab • Panel Interno
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
