# Walkthrough: Integración Completa del Lead Scraper (Google Places + Gemini 3.6 Flash)

Hemos conectado y habilitado la arquitectura real de prospección B2B para **CreApp Business OS**:

---

## ⚡ Conexión y Autenticación con Google AI Studio
1. **API Key de Gemini Verificada:**
   - La clave provista de Google AI Studio ha sido verificada y autenticada con éxito utilizando el modelo **`gemini-3.6-flash`**.
   - Guardada de forma persistente en `.env.local` y accesible también mediante el almacenamiento local.
2. **Monitor de Estado en Vivo (Real-Time API Status):**
   - El badge falso estático ha sido reemplazado por un monitor en vivo:
     - 🟢 **`Gemini 3.6 Flash: En línea`**: Testea la conexión real con los servidores de Google.
     - 🟡 / 🟢 **`Google Places: Opcional / Activo`**: Indica si está configurada la clave de Google Maps.

---

## 🗺️ Integración con Google Places API (Proxy Backend en Vite)
- **Endpoint Proxy Seguro (`/api/places/search`):**
  - Implementado en `vite.config.ts` para evitar bloqueos de CORS del navegador al consultar la API de Google Maps Places.
  - Soporta búsquedas de locales comerciales con extracción de `place_id`, nombre, dirección, rating, número de reseñas, teléfono y sitio web.
- **Modal de Configuración de APIs (`[⚙️]`):**
  - Permite ingresar o actualizar la `GOOGLE_MAPS_API_KEY` directamente desde la interfaz de usuario con enlace a Google Cloud Console.

---

## 🧠 Flujo de Prospección & Calificación con Gemini
1. **Búsqueda Geográfica:** El usuario selecciona la industria (Gastronomía, Clínicas Dentales, Agroindustria, Inmobiliarias, etc.) y escribe la ciudad (ej: *Córdoba*, *Rosario*, *Buenos Aires*).
2. **Extracción y Diagnóstico de Salud Digital:**
   - Detecta si el negocio tiene o no sitio web propio.
   - Diagnostica el dolor operativo (ej: dependencia de comisiones en apps terceras, falta de reservas online).
   - Asigna el producto correspondiente de CreApp (`Stacked SaaS`, `Dental IA`, `TrazApp`, etc.) y el presupuesto sugerido en USD.
3. **Generador de Pitches IA:**
   - Redacta mensajes persuasivos para WhatsApp, Email o LinkedIn listos para enviar con botón directo a WhatsApp Web.
4. **Importación al Pipeline:**
   - Transfiere la cuenta con un solo clic a la primera columna del Pipeline CRM Kanban.
