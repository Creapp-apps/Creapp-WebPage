import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Volume2,
  FileSignature,
  Eye,
  Users,
  Radio,
  CreditCard,
  Rocket,
} from 'lucide-react';
import { useNotifications, NotificationItem } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const {
    permission,
    fcmToken,
    isConfigured,
    loading,
    notifications,
    unreadCount,
    activeToast,
    dismissToast,
    requestPushPermission,
    markAllAsRead,
    markAsRead,
    clearAll,
    sendLocalTestNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.url) {
      setIsOpen(false);
      if (item.url.startsWith('http')) {
        window.open(item.url, '_blank');
      } else {
        navigate(item.url);
      }
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return 'Hace instantes';
      if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
      return new Date(isoString).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* BELL TRIGGER BUTTON */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && unreadCount > 0) {
              // mark visible
            }
          }}
          className={`relative p-2 rounded-xl border transition-all flex items-center justify-center min-w-[40px] min-h-[40px] active:scale-95 ${
            isOpen
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-zinc-300 hover:text-white'
          }`}
          title="Notificaciones y Alertas FCM"
          aria-label="Abrir centro de notificaciones"
        >
          <Bell size={16} className={unreadCount > 0 ? 'animate-bounce text-pink-400' : ''} />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[9px] font-black text-white shadow-lg shadow-pink-500/40 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* DROPDOWN MENU */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#0c0c12]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-3 flex flex-col gap-2 backdrop-blur-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Bell size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Notificaciones
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      FCM Push Engine • {isConfigured ? 'Conectado' : 'Modo Local'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                      title="Marcar todas como leídas"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Vaciar historial"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Push Permission Banner */}
              {permission !== 'granted' ? (
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={16} className="text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        Activá Notificaciones Push
                      </h4>
                      <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">
                        Recibí alertas instantáneas cuando un cliente abra o firme una propuesta, o entre un lead.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={requestPushPermission}
                    disabled={loading}
                    className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Bell size={13} />
                        <span>Habilitar Push en este navegador</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 size={14} />
                    <span>Push activo en este dispositivo</span>
                  </div>
                  <button
                    onClick={() => sendLocalTestNotification()}
                    className="text-[10px] text-purple-300 hover:text-purple-200 font-mono underline hover:no-underline transition-colors"
                  >
                    Enviar prueba
                  </button>
                </div>
              )}

              {/* Notification List */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
                      <Bell size={18} className="opacity-40" />
                    </div>
                    <p className="text-xs font-medium">No tenés notificaciones aún</p>
                    <p className="text-[10px] text-zinc-600 max-w-[200px]">
                      Las alertas automáticas del CRM, propuestas y contratos aparecerán acá.
                    </p>
                    <button
                      onClick={() => sendLocalTestNotification()}
                      className="mt-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-medium border border-white/10 transition-colors"
                    >
                      Generar alerta de prueba
                    </button>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        item.read
                          ? 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5 text-zinc-400'
                          : 'bg-purple-500/[0.06] hover:bg-purple-500/[0.1] border-purple-500/20 text-white'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.data?.type === 'contract_signed' || item.title.includes('Contrato') ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <FileSignature size={12} />
                          </div>
                        ) : item.data?.type === 'proposal_viewed' || item.title.includes('navegando') ? (
                          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                            <Eye size={12} />
                          </div>
                        ) : item.data?.type === 'proposal_accepted' || item.title.includes('Aceptada') ? (
                          <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                            <Rocket size={12} />
                          </div>
                        ) : item.data?.type === 'lead_assigned' || item.title.includes('Lead') || item.title.includes('Prospecto') ? (
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                            <Sparkles size={12} />
                          </div>
                        ) : item.data?.type === 'noc_alert' || item.title.includes('NOC') ? (
                          <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                            <Radio size={12} />
                          </div>
                        ) : item.data?.type === 'subscription_due' || item.title.includes('Abono') ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <CreditCard size={12} />
                          </div>
                        ) : item.data?.type === 'team_activated' || item.title.includes('Miembro') ? (
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                            <Users size={12} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                            <Sparkles size={12} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-semibold truncate ${
                              item.read ? 'text-zinc-300' : 'text-white'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <span className="text-[9px] text-zinc-500 shrink-0 font-mono">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2 mt-0.5">
                          {item.body}
                        </p>
                        {item.url && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-purple-400 group-hover:text-purple-300">
                            <span>Ver detalle</span>
                            <ExternalLink size={10} />
                          </div>
                        )}
                      </div>

                      {!item.read && (
                        <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1 shadow-sm shadow-pink-500" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 px-1">
                <span>Firebase Cloud Messaging</span>
                <span className="font-mono">
                  {fcmToken ? `Token: ${fcmToken.slice(0, 8)}...` : 'Sin registrar'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* IN-APP FLOATING TOAST NOTIFICATION (Foreground) */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-5 right-5 z-[9999] max-w-sm w-full bg-[#0d0d14]/95 border border-purple-500/40 rounded-2xl shadow-2xl p-4 backdrop-blur-2xl text-white flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/30 shrink-0">
              <Bell size={18} />
            </div>

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => handleNotificationClick(activeToast)}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 font-bold">
                  CreAPP Notificación
                </span>
                <span className="text-[10px] text-zinc-500">• Ahora</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5 truncate">
                {activeToast.title}
              </h4>
              <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
                {activeToast.body}
              </p>
            </div>

            <button
              onClick={dismissToast}
              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
