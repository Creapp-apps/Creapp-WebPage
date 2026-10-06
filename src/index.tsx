import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

// Inicialización de Sentry con la cuenta de CreAPP
Sentry.init({
  dsn: "https://99158dd1df95b165117dcf04fd255438@o451228093275904.ingest.us.sentry.io/4512281008419328",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: true, // Bloquea grabación pesada de canvas/WebGL en móvil
    }),
  ],
  tracesSampleRate: 0.2,
  tracePropagationTargets: ["localhost", /^https:\/\/creapp-web-page\.vercel\.app/],
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
});

// Enviar evento de verificación para desbloquear la pantalla de Sentry
if (typeof window !== 'undefined') {
  (window as any).triggerSentryTest = () => {
    Sentry.captureException(new Error("⚡ Test de conexión inicial CreAPP x Sentry"));
    console.log("Evento enviado a Sentry");
  };
}

// Registro de PWA Service Worker
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
        console.log('⚡ [CreAPP PWA] Service Worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ [CreAPP PWA] Error al registrar Service Worker:', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
