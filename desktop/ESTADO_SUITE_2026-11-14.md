# CreAPP Suite desktop — estado 2026-11-14

Dos cosas resueltas y verificadas hoy. Punto de retome al final.

## 1. Arranque directo al login de agencia (no la landing pública)

**Problema:** al abrir `CreAPP Suite.app` levantaba la home de marketing ("Soluciones
Digitales"), no el login de la agencia.

**Causa:** el shell Electron cargaba `uiServer.url` = `/`, y la SPA (react-router)
cae en `LandingPage` en la raíz. El login de agencia vive en `/admin/login`
(y `/admin` tras `AuthGuard`).

**Fix:** `desktop/main.mjs:181` — `mainWindow.loadURL(uiServer.url + 'admin')`.
- Sin sesión → `AuthGuard` (`src/components/auth/AuthGuard.tsx:23`) redirige a `/admin/login`.
- Con sesión → entra directo al panel.

Requiere rebuild de la `.app` (`cd desktop && npm run dist`) para que el `.app`
tome el cambio: el `main.mjs` va dentro de `app.asar`. Hecho y verificado.

> Si se quiere forzar login SIEMPRE (aunque haya sesión), cambiar `'admin'` por
> `'admin/login'` y rebuildar.

## 2. La suite mostraba el Pipeline/CRM en cero; la web no

**Síntoma:** en la web (`localhost:3001/admin?tab=pipeline`, dev server) se veía el
lead de prueba `pixxsssxaaaaaa` (Stacked SaaS / Gastronomía) en "Contacto & Diagnóstico"
y el Dashboard con $22.222 USD. En la suite, todo en cero.

**Diagnóstico:**
- El lead vive en **Supabase nube** (tabla `leads`), no en localStorage. Prueba: la
  web en **Incógnito** también lo muestra.
- Ambos (web y suite) apuntan al mismo Supabase: `yjrqpjlzyxivwpfcatvt.supabase.co`.
- El Pipeline/CRM lee de Supabase: `src/lib/pipelineService.ts` → `.from('leads')`.
- La tabla `leads` del kanban se (re)creó **hoy**: migración
  `supabase/migrations/20261114170000_create_leads_table.sql` (14 nov 17:48).
- La suite servía `creappPath/dist` de un build del **9 nov 23:41** (5 días viejo,
  anterior a esa migración) → no leía el schema nuevo → cero. La web corre el código
  fresco vía dev server, por eso sí.

**Fix:** rebuild del `dist` web →
`cd ~/Desktop/CREAPP/creapp---fintech-innovation-hub && npm run build` (vite, ~6s).
`dist/index.html` quedó en 14 nov 20:13. El uiServer de la suite
(`desktop/src/uiServer.mjs`) sirve `creappPath/dist` leyendo de disco en cada
request, así que bastó **recargar la ventana de la suite** (Cmd+R).

**Verificado:** los datos ya se ven actualizados en la suite. ✅

## Arquitectura relevante (recordatorio)

- `desktop/main.mjs` — shell Electron. `launchMotor()` arranca el motor Python
  (`:8000`), levanta `uiServer` (`:4599`) sirviendo `creappPath/dist`, y carga
  `/admin`.
- `desktop/src/config.mjs` — defaults: `creappPath` =
  `/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub`, `uiPort` 4599,
  `motorPort` 8000. Override en `~/.creapp-desktop/config.json`.
- La `.app` empaquetada: `desktop/dist/mac-arm64/CreAPP Suite.app` (unsigned).
  `main.mjs` va en `Contents/Resources/app.asar`.

## 3. Auto-build del dist al arrancar (RESUELTO 2026-11-15)

Para que el `dist` no quede viejo: la suite ahora **rebuildea la UI web en cada
arranque**, en paralelo al arranque del motor, y espera el build antes de servir el
`dist`.

- Módulo nuevo: `desktop/src/webBuild.mjs` → `buildWebUi(config)` corre
  `npm run build` en `creappPath`. **Resiliente:** nunca cuelga (timeout 180s →
  SIGKILL) y nunca tira; devuelve `{ ok, error? }`. PATH con Homebrew antepuesto
  (`buildExecEnv`) para que npm/node se vean en app empaquetada desde Finder.
- Cableado: `main.mjs` `launchMotor()` — `const building = buildWebUi(cfg)` arranca
  junto al motor; `await building` antes de `startUiServer`. Si `!ok`, loguea y
  sirve el dist previo (no rompe el arranque).
- Tests: `desktop/src/webBuild.test.mjs` (5, verde). Suite desktop: 85/85.
- Empaquetado y verificado en `app.asar`.

**Costo:** suma el tiempo del build al arranque (solapa con el motor; el build full
tomó ~6.5s). **Riesgo documentado:** vite vacía `dist/` al empezar (`emptyOutDir`);
si el build falla DESPUÉS de vaciar y antes de emitir, el `dist` queda incompleto y
la suite serviría UI rota. En la práctica vite aborta en transform/type-check antes
de emitir. Si molesta, buildear a un dir temporal y promover sólo si `ok`.

> Opciones descartadas: apuntar al dev server `:3001` en dev; dejar manual.
