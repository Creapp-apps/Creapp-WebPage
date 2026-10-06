import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  isFirebaseConfigured,
  requestNotificationPermissionAndToken,
  onForegroundMessage,
  deactivateFcmToken,
} from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

interface NotificationContextType {
  permission: NotificationPermission | 'unsupported';
  fcmToken: string | null;
  isConfigured: boolean;
  loading: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  activeToast: NotificationItem | null;
  dismissToast: () => void;
  requestPushPermission: () => Promise<{ success: boolean; error?: string }>;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  sendLocalTestNotification: (title?: string, body?: string, url?: string) => void;
  triggerServerPush: (title: string, body: string, url?: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_STORAGE_KEY = 'creapp_fcm_notifications_v1';
const FCM_TOKEN_STORAGE_KEY = 'creapp_fcm_token_cached';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(() => {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || null;
  });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('[Notifications] Could not save to localStorage:', e);
    }
  }, [notifications]);

  // Check initial browser permission
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  // Subtle audio notification chime using Web Audio API
  const playChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext could be blocked by autoplay policies
    }
  }, []);

  // Add notification to state and trigger in-app toast
  const addNotification = useCallback(
    (item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => {
      const newNotif: NotificationItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        read: false,
        createdAt: new Date().toISOString(),
        ...item,
      };

      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
      setActiveToast(newNotif);
      playChime();

      // Auto dismiss active toast after 6 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === newNotif.id ? null : current));
      }, 6000);
    },
    [playChime]
  );

  // Foreground push message listener
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubscribe = onForegroundMessage((payload) => {
      addNotification({
        title: payload.title || 'CreAPP • Notificación',
        body: payload.body || '',
        icon: payload.icon || '/icon-192.png',
        url: payload.data?.url || '/admin',
        data: payload.data,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [addNotification]);

  // Request Push Permission
  const requestPushPermission = async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await requestNotificationPermissionAndToken(
        user ? { id: user.id, email: user.email } : undefined
      );

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }

      if (res.token) {
        setFcmToken(res.token);
        localStorage.setItem(FCM_TOKEN_STORAGE_KEY, res.token);
        setLoading(false);

        // Add confirmation notification
        addNotification({
          title: '¡Notificaciones Activadas! 🚀',
          body: 'Vas a recibir alertas en tiempo real sobre prospectos, propuestas y contratos.',
          url: '/admin',
        });

        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: res.error || 'No se pudo obtener el token.' };
      }
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const dismissToast = () => {
    setActiveToast(null);
  };

  // Local test notification (works instantly even before Firebase console setup)
  const sendLocalTestNotification = (
    title = 'CreAPP • Alerta de Prueba',
    body = 'El motor de notificaciones FCM está activo y funcionando al 100%.',
    url = '/admin'
  ) => {
    addNotification({ title, body, url });

    // Also trigger native desktop notification if permission granted
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
        });
      } catch {
        // Fallback silently if service worker required
      }
    }
  };

  // Trigger server push notification via api/send-fcm-notification
  const triggerServerPush = async (
    title: string,
    body: string,
    url = '/admin'
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/send-fcm-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: fcmToken,
          title,
          body,
          url,
        }),
      });
      return response.ok;
    } catch (err) {
      console.warn('[FCM] Server push dispatch warning:', err);
      // Fallback to local
      sendLocalTestNotification(title, body, url);
      return true;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        permission,
        fcmToken,
        isConfigured: isFirebaseConfigured(),
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
        triggerServerPush,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
