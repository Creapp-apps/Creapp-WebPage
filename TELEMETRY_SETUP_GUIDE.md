# 📡 CreAPP Mission Control — Guía de Conexión y Telemetría

> **Propósito:** Esta guía contiene los pasos exactos para conectar **Sentry** y tus aplicaciones desplegadas (**Célebra Eventos**, **Creador de Contenidos**, **TrazApp**, **Belcalis**, etc.) con el Centro de Control y NOC de CreAPP.

---

## 🗄️ Paso 1: Crear las tablas en Supabase (1 minuto)

1. Abre tu consola de **[Supabase](https://supabase.com/dashboard)** en el proyecto de CreAPP.
2. Ve a la sección **SQL Editor**.
3. Abre o copia el contenido de `supabase_telemetry_schema.sql` (ubicado en la raíz de este proyecto).
4. Haz clic en **Run**.
5. ¡Listo! Se habrán creado las tablas `app_monitored_fleet` y `app_incidents` con sus políticas de seguridad RLS.

---

## 🔑 DSNs Oficiales Generados para tus 5 Aplicaciones

Ya dejamos creados los 5 proyectos en tu organización `creapp` de Sentry:

| Aplicación | Proyecto Sentry | DSN Oficial |
| :--- | :--- | :--- |
| 🦷 **Dental-IA** | `dental-ia` | `https://c502d27816ee7cf5e3ab792ee05e62ac@o4512200993275904.ingest.us.sentry.io/4512201144401920` |
| 🍔 **Stacked** | `stacked` | `https://2e8230515004e21f07f65acb56c86b6b@o4512200993275904.ingest.us.sentry.io/4512201144467456` |
| 👑 **Célebra** | `celebra` | `https://d91e2cec504c72aaa1d45fb2bc2833bb@o4512200993275904.ingest.us.sentry.io/4512201144532992` |
| 🌿 **TrazAPP** | `trazapp` | `https://b91d0bcc8b07d2598cf344e288389231@o4512200993275904.ingest.us.sentry.io/4512201144598528` |
| 💅 **Belcalis Nails** | `belcalis-nails` | `https://e0b2d77086fbd39f1eccc683650ffd0e@o4512200993275904.ingest.us.sentry.io/4512201144664064` |

---

## 📱 Cómo vincular cada aplicación (Solo 1 minuto por app)

En la carpeta de la app que quieras conectar (ej: **Célebra Eventos**):

1. Instala el SDK:
```bash
npm install @sentry/react
```

2. En `src/main.tsx` (o `index.tsx`) agrega:
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "PEGA_EL_DSN_CORRESPONDIENTE_DE_LA_TABLA_DE_ARRIBA",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  environment: "production",
});
```

---

## 🔗 Paso 4: Enviar Alertas desde Sentry a CreAPP (1 minuto)

Para que los errores que atrapa Sentry aparezcan automáticamente en el **NOC de CreAPP**:

1. En la consola de Sentry, ve a:  
   **Settings > Integrations > Webhooks** (o **Alerts > Create Alert Rule**).
2. Agrega la URL del endpoint que dejamos creado en CreAPP:
   ```text
   https://creapp-web-page.vercel.app/api/telemetry-webhook
   ```
3. Selecciona que notifique cuando ocurra: `issue.created` o `error`.

---

## ⚡ Alternativa Direct Push (Sin Sentry)

Si alguna app no usa Sentry, puede enviar errores directamente a CreAPP con este snippet en su `window.onerror`:

```typescript
window.addEventListener('error', (event) => {
  fetch('https://creapp-web-page.vercel.app/api/telemetry-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: 'celebra-eventos',
      title: event.message,
      errorType: event.error?.name || 'RuntimeError',
      severity: 'critical',
      stackTrace: event.error?.stack,
      urlPath: window.location.pathname,
      userDevice: {
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`
      }
    })
  }).catch(() => {});
});
```

---

## 🚀 Probar en el Panel de CreAPP

Abre tu panel en:
👉 **[http://localhost:3001/admin?tab=telemetry](http://localhost:3001/admin?tab=telemetry)**

- Revisa el radar en vivo de la flota.
- Haz clic en cualquier error para ver el **diagnóstico con Gemini AI** y el **diff de solución**.
- Usa el botón **"Simular Bug de Prueba"** cuando quieras hacer verificaciones.
