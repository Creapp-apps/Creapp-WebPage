import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  X,
  Check,
  AlertCircle,
  Lock,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Calendar,
  Bell,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { supabase } from '@/lib/supabaseClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, role, isAdmin, refreshProfile } = useAuth();
  const {
    permission,
    fcmToken,
    requestPushPermission,
    sendLocalTestNotification,
    isConfigured,
    loading: pushLoading,
  } = useNotifications();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // 1. Si cambió el nombre, actualizar en user_profiles y auth metadata
      if (fullName.trim() && fullName !== profile?.full_name) {
        if (profile?.id) {
          await supabase
            .from('user_profiles')
            .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
            .eq('id', profile.id);
        }
        await supabase.auth.updateUser({
          data: { full_name: fullName.trim() },
        });
        await refreshProfile();
      }

      // 2. Si ingresó nueva contraseña, actualizarla
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        const { error: pwdError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (pwdError) throw pwdError;
        setNewPassword('');
        setConfirmPassword('');
      }

      setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al actualizar el perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const initials = (profile?.full_name || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#0B101B] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-6"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-white font-black text-sm tracking-wider shadow-inner">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Mi Perfil CreApp</h3>
              <p className="text-xs text-zinc-400">Información de cuenta y credenciales de acceso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notifications */}
        {message && (
          <div
            className={`flex items-center gap-2.5 p-3 rounded-xl text-xs border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {message.type === 'success' ? (
              <Check size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Rol en la empresa</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAdmin ? (
                <>
                  <ShieldCheck size={15} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">Master Admin</span>
                </>
              ) : (
                <>
                  <Briefcase size={15} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-300">Vendedor Comercial</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Nivel de Acceso</span>
            <span className="text-xs font-semibold text-zinc-300 truncate mt-0.5">
              {isAdmin ? 'Acceso Total a Sistemas' : 'Herramientas de Ventas & CRM'}
            </span>
          </div>
        </div>

        {/* Formulario de actualización */}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Mail size={13} />
              Email de Usuario
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3.5 py-2.5 text-zinc-400 text-xs cursor-not-allowed"
            />
            <span className="text-[10px] text-zinc-500 block">El email está vinculado a tu cuenta en CreApp OS.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <User size={13} />
              Nombre Completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre y apellido"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Notificaciones Push Web (FCM) */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Bell size={13} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Notificaciones Push (FCM)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Alertas de propuestas, leads y contratos
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  permission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : permission === 'denied'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {permission === 'granted'
                  ? 'Activo'
                  : permission === 'denied'
                  ? 'Bloqueado'
                  : 'Pendiente'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
              <span className="text-[11px] text-zinc-400">
                {permission === 'granted'
                  ? 'Este dispositivo está listo para recibir alertas'
                  : 'Habilitá push para no perderte actualizaciones'}
              </span>

              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestPushPermission}
                  disabled={pushLoading}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Bell size={12} />
                  <span>Activar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => sendLocalTestNotification()}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 text-[10px] font-mono border border-white/10 transition-colors shrink-0"
                >
                  Test push
                </button>
              )}
            </div>
          </div>

          {/* Cambio de Contraseña */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Cambiar Contraseña (Opcional)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UserProfileModal;
