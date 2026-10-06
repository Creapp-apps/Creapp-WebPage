import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { supabase } from '@/lib/supabaseClient';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Checks if the minimal required Firebase credentials are present.
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId);
};

let app: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
};

/**
 * Lazily initialize and return the Firebase Messaging instance if supported.
 */
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn('[FCM] Firebase Messaging is not supported in this browser environment.');
    return null;
  }

  const fbApp = getFirebaseApp();
  if (!fbApp) {
    return null;
  }

  messagingInstance = getMessaging(fbApp);
  return messagingInstance;
};

/**
 * Detects device category (mobile, tablet, desktop).
 */
const getDeviceType = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  return 'desktop';
};

/**
 * Registers the Service Worker and requests user permission to receive Web Push notifications.
 * If granted, generates an FCM token and stores/upserts it into Supabase.
 */
export const requestNotificationPermissionAndToken = async (user?: {
  id?: string;
  email?: string;
}): Promise<{ token: string | null; error?: string }> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { token: null, error: 'Este navegador no soporta notificaciones de escritorio.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, error: 'Permiso de notificaciones denegado o cerrado.' };
    }

    if (!isFirebaseConfigured()) {
      return {
        token: null,
        error: 'Variables de entorno de Firebase no configuradas (VITE_FIREBASE_API_KEY, etc).',
      };
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { token: null, error: 'No se pudo inicializar Firebase Messaging.' };
    }

    // Register / obtain service worker registration for FCM
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(
          firebaseConfig.apiKey
        )}&projectId=${encodeURIComponent(
          firebaseConfig.projectId
        )}&messagingSenderId=${encodeURIComponent(
          firebaseConfig.messagingSenderId
        )}&appId=${encodeURIComponent(firebaseConfig.appId)}`;

        swRegistration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM] Service Worker registration warning, falling back to default:', swErr);
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY || undefined,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return { token: null, error: 'No se pudo generar el token FCM desde Firebase.' };
    }

    // Save or upsert the token into Supabase for this device
    try {
      const payload: Record<string, any> = {
        fcm_token: token,
        device_type: getDeviceType(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (user?.id) {
        payload.user_id = user.id;
      }
      if (user?.email) {
        payload.user_email = user.email;
      }

      await supabase.from('user_fcm_tokens').upsert(payload, {
        onConflict: 'fcm_token',
      });
      console.log('[FCM] Token guardado exitosamente en Supabase:', token.slice(0, 15) + '...');
    } catch (dbErr) {
      console.warn('[FCM] Aviso al guardar token en Supabase (la tabla podría requerir migración):', dbErr);
    }

    return { token };
  } catch (err: any) {
    console.error('[FCM] Error en requestNotificationPermissionAndToken:', err);
    return { token: null, error: err.message || 'Error desconocido al solicitar FCM token.' };
  }
};

/**
 * Listens for incoming push notifications while the app is in the foreground.
 */
export const onForegroundMessage = (
  callback: (payload: {
    title?: string;
    body?: string;
    icon?: string;
    data?: Record<string, any>;
  }) => void
): (() => void) => {
  let unsubscribe = () => {};

  getFirebaseMessaging().then((messaging) => {
    if (!messaging) return;

    unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Mensaje recibido en primer plano:', payload);
      callback({
        title: payload.notification?.title || payload.data?.title || 'CreAPP • Notificación',
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || '/icon-192.png',
        data: payload.data,
      });
    });
  });

  return () => {
    unsubscribe();
  };
};

/**
 * Deactivates an FCM token on logout or user preference disable.
 */
export const deactivateFcmToken = async (token: string): Promise<void> => {
  if (!token) return;
  try {
    await supabase.from('user_fcm_tokens').update({ is_active: false }).eq('fcm_token', token);
  } catch (err) {
    console.warn('[FCM] Error al desactivar token:', err);
  }
};
