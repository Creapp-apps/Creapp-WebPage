// Firebase Cloud Messaging Service Worker for CreAPP Suite
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Parse config from URL search params if passed, or use defaults for CreAPP
const urlParams = new URL(location.href).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || 'AIzaSyCqZCF1fhyAIBwaTJH-Z7GGpCFLOuJaiIo',
  authDomain: urlParams.get('authDomain') || 'creapp-e249b.firebaseapp.com',
  projectId: urlParams.get('projectId') || 'creapp-e249b',
  storageBucket: urlParams.get('storageBucket') || 'creapp-e249b.firebasestorage.app',
  messagingSenderId: urlParams.get('messagingSenderId') || '307195656505',
  appId: urlParams.get('appId') || '1:307195656505:web:2c3d6d194e837942ba10e8',
};

// Initialize Firebase in Service Worker if configured
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Background message received:', payload);
      const notificationTitle = payload.notification?.title || payload.data?.title || 'CreAPP • Notificación';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Nueva actividad en tu panel de CreAPP.',
        icon: payload.notification?.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.tag || 'creapp-notification',
        data: {
          url: payload.data?.url || '/admin',
          ...payload.data,
        },
        vibrate: [100, 50, 100],
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] Failed to initialize Firebase messaging:', err);
  }
}

// Handle notification click to open or focus relevant CreAPP window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
