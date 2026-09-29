import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  X,
  Check,
  AlertCircle,
  Lock,
  Mail,
  User,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth, UserProfile, UserRole } from '@/context/AuthContext';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose }) => {
  const { listUsers, createSalesUser, updateUserRole, profile: myProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('vendedor');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await listUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setError(null);
      setSuccessMsg(null);
      setIsCreating(false);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password || !fullName) {
      setError('Por favor completá todos los campos.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmitLoading(true);
    const result = await createSalesUser({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      role,
    });
    setSubmitLoading(false);

    if (result.success) {
      setSuccessMsg(`¡Usuario ${fullName} (${role}) creado con éxito! Ya puede iniciar sesión.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('vendedor');
      setIsCreating(false);
      await fetchUsers();
    } else {
      setError(result.error || 'Ocurrió un error al crear el usuario.');
    }
  };

  const handleToggleRole = async (targetUser: UserProfile) => {
    if (targetUser.id === myProfile?.id) {
      alert('No podés cambiar tu propio rol.');
      return;
    }

    const newRole: UserRole = targetUser.role === 'admin' ? 'vendedor' : 'admin';
    const confirmChange = confirm(
      `¿Cambiar el rol de ${targetUser.email} a "${newRole.toUpperCase()}"?`
    );
    if (!confirmChange) return;

    const res = await updateUserRole(targetUser.id, newRole);
    if (res.success) {
      await fetchUsers();
    } else {
      alert(res.error || 'No se pudo actualizar el rol');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#0B101B] border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-6"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Gestión de Equipo & Vendedores
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Master Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Crea accesos comerciales con permisos restringidos únicamente a ventas.
              </p>
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
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <Check size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Button & Permission Hint */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Shield size={15} className="text-purple-400 shrink-0" />
            <span>
              <strong>Rol Vendedor:</strong> Acceso a Scraper, Pipeline y Propuestas. Finanzas y Vault ocultos.
            </span>
          </div>
          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setError(null);
              setSuccessMsg(null);
            }}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm shrink-0"
          >
            <UserPlus size={14} />
            <span>{isCreating ? 'Ver Lista' : '+ Nuevo Vendedor'}</span>
          </button>
        </div>

        {/* Mode: Form to Create User */}
        {isCreating ? (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <User size={13} />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <Mail size={13} />
                  Email del Vendedor
                </label>
                <input
                  type="email"
                  required
                  placeholder="marcos@creapp.com.ar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <Lock size={13} />
                  Contraseña Provisoria
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <Shield size={13} />
                  Rol a Asignar
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-[#121622] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500/50"
                >
                  <option value="vendedor">Vendedor (Solo Ventas & Crecimiento)</option>
                  <option value="admin">Master Admin (Acceso Total)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {submitLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>Crear Acceso Comercial</span>
              </button>
            </div>
          </form>
        ) : (
          /* Mode: List Team Users */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Miembros del Sistema ({users.length})</span>
              <button
                onClick={fetchUsers}
                className="p-1 hover:text-white transition-colors"
                title="Recargar"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-500">Cargando miembros...</div>
              ) : users.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  Aún no hay perfiles en la base de datos. Creá el primero con el botón "+ Nuevo Vendedor".
                </div>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === myProfile?.id;
                  const isUserAdmin = u.role === 'admin';

                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isUserAdmin
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {isUserAdmin ? <Shield size={14} /> : <Briefcase size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {u.full_name || u.email.split('@')[0]}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                                Vos
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono truncate block">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={isCurrent}
                          title={isCurrent ? 'Tu propio rol' : 'Clic para cambiar rol'}
                          className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                            isUserAdmin
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                          } ${isCurrent ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                        >
                          {isUserAdmin ? 'Master Admin' : 'Vendedor'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TeamManagementModal;
