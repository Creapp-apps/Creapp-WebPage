# CreAPP Desktop Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una app de escritorio macOS (doble clic) que preflight-chequea dependencias, levanta el motor local y abre la UI de CreAPP en una ventana, con resiliencia de red (indicador global + toast con reintento) para las operaciones pesadas.

**Architecture:** Cáscara Electron en `desktop/` del repo CreAPP. Módulos core puros e inyectables (config, preflight, motor, connectivity, resilience) testeados con `node:test`; el wiring de Electron (ventanas, IPC) es fino encima. La UI React existente se carga sin tocar, servida por un mini static server local. El motor (repo Python aparte) se spawnea como proceso hijo; una edición quirúrgica lo hace reportar el estado de sus subidas.

**Tech Stack:** Electron (stable), Node (ESM `.mjs`), electron-builder (mac unsigned), `node:test`. Motor: Python/FastAPI (edición mínima). UI: Vite+React19 existente (sin reescribir).

**Spec:** `docs/superpowers/specs/2026-11-14-creapp-desktop-suite-design.md`

## Global Constraints
- **Solo macOS.** Un target de packaging; paths POSIX (`.venv/bin/uvicorn`), kill por SIGTERM.
- El proyecto vive en **`desktop/`** del repo CreAPP, con su propio `package.json`. No modifica el build ni el código de la UI salvo lo que diga una tarea explícita de renderer (indicador/toast bridge).
- **Comando del motor:** `<motorPath>/.venv/bin/uvicorn src.web.app:app --port <motorPort>` (sin `--reload`). Default `motorPort=8000`.
- **Healthcheck del motor:** `GET http://127.0.0.1:<motorPort>/` responde 200 dentro de un timeout (default 30 s, poll cada 500 ms).
- **Config:** `~/.creapp-desktop/config.json` → `{ motorPath, creappPath, motorPort?, uiPort? }`. Defaults: `motorPath="~/Desktop/PROYECTOS DEV/Creador de Contenidos"`, `creappPath=<repo CreAPP root>`, `motorPort=8000`, `uiPort=4599`.
- **Carga de UI:** static server local sirve `<creappPath>/dist/`; la ventana hace `loadURL('http://127.0.0.1:<uiPort>/')`. SPA fallback: cualquier ruta no-asset devuelve `index.html` (para `BrowserRouter`).
- **Avisos:** reusar el toast central existente de la UI vía IPC main→renderer. Prohibido `dialog`/alert nativo para fallas de operación. Todo texto en es-AR.
- **Edición del motor:** solo para destapar/expone errores de subida. No reescritura.
- **Tests:** cada módulo core tiene su `*.test.mjs`, corre con `node --test`. `desktop/package.json` script `test`.

## Review Focus
- **Motor no arranca** (venv roto, `:8000` ocupado por una instancia previa): el process manager reporta falla clara con timeout, no cuelga la app. (Task 5)
- **Conexión se pierde a mitad de una operación** (intermitencia, no offline al inicio): la operación pesada detecta el corte → toast + reintento. (Task 8, 11)
- **Motor hijo no muere al cerrar** la app → uvicorn huérfano ocupa `:8000` y el próximo arranque choca: cierre ordenado + SIGTERM garantizado. (Task 5)
- **Config faltante o corrupto**: se recrea con defaults, no crashea. (Task 2)
- **Deep-link / asset bajo BrowserRouter** servido desde localhost: `/admin` recargado y `/assets/x` resuelven (fallback a index.html). (Task 6)

---

## Task 1: Scaffold del proyecto Electron `desktop/`

**Files:**
- Create: `desktop/package.json`, `desktop/main.mjs`, `desktop/preload.mjs`, `desktop/electron-builder.yml`, `desktop/.gitignore`
- Create: `desktop/src/` (vacío por ahora)

**Interfaces:**
- Produces: `npm --prefix desktop start` abre una ventana Electron en blanco; `npm --prefix desktop test` corre `node --test` (0 tests, sale 0).

- [ ] **Step 1:** `package.json` con `"type":"module"`, deps `electron`, `electron-builder` (dev), scripts `start` (`electron .`), `test` (`node --test src/**/*.test.mjs`), `dist` (`electron-builder --mac --dir` para no firmar). Fijar versiones exactas ≥2 semanas.
- [ ] **Step 2:** `main.mjs` mínimo: crea `BrowserWindow` 1440×900, carga un `about:blank` provisional, `app.whenReady`.
- [ ] **Step 3:** `electron-builder.yml`: `mac.target: dir`, `identity: null` (unsigned), `appId: com.creapp.desktop`, `productName: "CreAPP Suite"`.
- [ ] **Step 4:** Correr `npm --prefix desktop start` → verificar ventana en blanco. Commit.

## Task 2: Config loader

**Files:**
- Create: `desktop/src/config.mjs`, `desktop/src/config.test.mjs`

**Interfaces:**
- Produces: `defaultConfig(): Config`; `loadConfig({ home?, fs? }): Config` (lee/crea `~/.creapp-desktop/config.json`, mergea sobre defaults, expande `~`); `Config = { motorPath, creappPath, motorPort, uiPort }`.

- [ ] **Step 1 (test):** `config.test.mjs`: (a) falta el archivo → `loadConfig` lo crea con defaults y devuelve defaults; (b) JSON corrupto → devuelve defaults sin tirar; (c) override parcial (`{motorPort:8100}`) → mergea sobre defaults; (d) expande `~` en los paths. Inyectar `fs` y `home` temporales.
- [ ] **Step 2:** Correr, verificar que fallan.
- [ ] **Step 3:** Implementar `config.mjs` (defaults de Global Constraints, `try/catch` en el parse, `mkdir -p` del dir).
- [ ] **Step 4:** Tests en verde. Commit.

## Task 3: Preflight de dependencias (núcleo)

**Files:**
- Create: `desktop/src/preflight.mjs`, `desktop/src/preflight.test.mjs`

**Interfaces:**
- Consumes: `Config` (Task 2).
- Produces: `runPreflight(config, { exec, fs }): Promise<{ ok: boolean, checks: Check[] }>`; `Check = { id, label, ok, detail, fix }`. Checks: `paths` (motorPath/creappPath existen), `python` (3.9+), `venv` (import `fastapi` desde `<motorPath>/.venv/bin/python -c`), `ffmpeg`, `ffprobe`, `node`, `remotion_modules` (`<motorPath>/src/remotion/node_modules` existe), `ui_build` (`<creappPath>/dist/index.html` existe). `exec`/`fs` inyectables.

- [ ] **Step 1 (test):** por cada check, un caso ok y uno falla (mock `exec` que resuelve/rechaza y `fs` que existe/no); `ok` global = AND de todos; cada falla trae `fix` en es-AR (ej. ffmpeg → `"brew install ffmpeg"`, ui_build → `"corré npm run build en el repo CreAPP"`).
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar `preflight.mjs`.
- [ ] **Step 4:** Verde. Commit.

## Task 4: Ventana de preflight (UI)

**Files:**
- Create: `desktop/renderer/preflight.html`, `desktop/renderer/preflight.js`
- Modify: `desktop/main.mjs`

**Interfaces:**
- Consumes: `runPreflight` (Task 3) vía IPC `preflight:run`.
- Produces: al abrir la app, si `!ok` muestra la lista de checks fallados (label + detail + fix) con botón **"Reintentar"** (re-corre preflight); no avanza a la ventana principal hasta `ok`. Si `ok`, pasa al arranque del motor (Task 5).

- [ ] **Step 1:** `main.mjs`: handler IPC `preflight:run` → `runPreflight(loadConfig(), realDeps)`. Al `whenReady`, cargar `preflight.html`.
- [ ] **Step 2:** `preflight.js`: pide `preflight:run`, pinta checks (verde/rojo), botón Reintentar; al `ok` emite `app:proceed`.
- [ ] **Step 3 (verify):** con una dep faltante simulada (ej. renombrar `dist/`), la ventana lista el ítem con su fix; al restaurar + Reintentar, pasa. Commit.

## Task 5: Manager del proceso motor

**Files:**
- Create: `desktop/src/motor.mjs`, `desktop/src/motor.test.mjs`
- Modify: `desktop/main.mjs`

**Interfaces:**
- Consumes: `Config`.
- Produces: `startMotor(config, { spawn, fetch, timeoutMs, pollMs }): Promise<MotorHandle>` (spawnea uvicorn, poll a `GET /` hasta 200 o timeout, resuelve con `{ proc, port }` o rechaza con motivo `motor_timeout`/`motor_exit`); `stopMotor(handle)` (SIGTERM, espera exit). Expone `onLog(cb)` (stdout/stderr del motor).

- [ ] **Step 1 (test):** inyectar `spawn` falso (emite stdout, no muere) + `fetch` falso: (a) health 200 al 3er intento → resuelve con el puerto; (b) nunca 200 → rechaza `motor_timeout` dentro del timeout; (c) el proc emite `exit` antes del health → rechaza `motor_exit` con el código; (d) `stopMotor` manda SIGTERM y resuelve al `exit`.
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar `motor.mjs` (comando de Global Constraints, `child_process.spawn`, `cwd=motorPath`).
- [ ] **Step 4:** Verde. En `main.mjs`: tras `app:proceed`, `startMotor`; en `before-quit`, `stopMotor` (garantizar que no quede huérfano). Commit.

## Task 6: Static server de la UI + ventana principal

**Files:**
- Create: `desktop/src/uiServer.mjs`, `desktop/src/uiServer.test.mjs`
- Modify: `desktop/main.mjs`

**Interfaces:**
- Consumes: `Config` (`creappPath`, `uiPort`).
- Produces: `startUiServer(config, { http, fs }): Promise<{ url, close }>` sirve `<creappPath>/dist/`: assets reales por su ruta; cualquier otra ruta (deep-link SPA) → `index.html` con 200.

- [ ] **Step 1 (test):** con un `dist/` temporal (`index.html`, `assets/app.js`): (a) `GET /assets/app.js` → el archivo + content-type js; (b) `GET /admin` → el contenido de `index.html` (fallback SPA); (c) `GET /` → `index.html`.
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar `uiServer.mjs` (http nativo, sin deps; MIME mínimo por extensión).
- [ ] **Step 4:** Verde. En `main.mjs`: tras motor healthy, `startUiServer` y `win.loadURL(url)`. Links del Estudio del motor (`http://localhost:8000/...` de `motorStudio.ts`) se abren con `shell.openExternal` (navegador) — interceptar `setWindowOpenHandler`. Commit.

## Task 7: Monitor de conectividad

**Files:**
- Create: `desktop/src/connectivity.mjs`, `desktop/src/connectivity.test.mjs`

**Interfaces:**
- Produces: `createMonitor({ probes, intervalMs }): Monitor`. `probes = { supabase, r2, git }` (cada una `() => Promise<boolean>`). `Monitor.on('change', ({ online, services }) => ...)`, `Monitor.on('connection-lost', ...)`, `checkNow()`, `start()/stop()`. `online = alguna/necesaria probe ok`; emite `connection-lost` en la transición online→offline.

- [ ] **Step 1 (test):** inyectar probes controlables + timers falsos: (a) todas ok → `online:true`, services todos verdes; (b) una probe falla → esa service roja, el resto verde; (c) todas fallan tras estar online → un (y solo un) evento `connection-lost`; (d) vuelven → `change` con `online:true` (sin doble `connection-lost`).
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar (state machine con último estado; evita re-emitir).
- [ ] **Step 4:** Verde. Definir las probes reales en un módulo aparte `desktop/src/probes.mjs`: `supabase` = `HEAD <SUPABASE_URL>/rest/v1/` con timeout; `r2` = `HEAD` al dominio R2; `git` = `git ls-remote --exit-code <remote>` en `creappPath` con timeout. Commit.

## Task 8: Wrapper de resiliencia (reintento)

**Files:**
- Create: `desktop/src/resilience.mjs`, `desktop/src/resilience.test.mjs`

**Interfaces:**
- Produces: `runWithRetry(op, { label, onEvent, timeoutMs }): Promise<Result>`. `op` = `() => Promise<any>`. Detecta falla/rechazo e **intermitencia** (timeout). Emite `onEvent({ type:'failed', label, error, retry })` donde `retry()` re-ejecuta; `{ type:'success' }` al completar.

- [ ] **Step 1 (test):** (a) op ok al primer intento → `success`, sin `failed`; (b) op rechaza → `failed` con un `retry()` que, llamado, re-ejecuta y puede resolver; (c) op que nunca resuelve y supera `timeoutMs` → `failed` tipo intermitencia.
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar (`Promise.race` con timeout; `retry` cierra sobre `op`).
- [ ] **Step 4:** Verde. Commit.

## Task 9: Bridge IPC + toast + indicador (renderer)

**Files:**
- Create: `desktop/src/ipcPayload.mjs`, `desktop/src/ipcPayload.test.mjs`
- Modify: `desktop/preload.mjs`, `desktop/main.mjs`
- Create: `desktop/renderer/overlay.js` (indicador + receptor de toast)

**Interfaces:**
- Consumes: eventos de Task 7 (connectivity) y Task 8 (resilience) en el main.
- Produces: `toToastPayload(event): { title, body, action? }` (puro, es-AR); preload expone `window.creappDesktop.onToast(cb)` y `onConnectivity(cb)`; el overlay del renderer llama al **toast central existente** de la UI y pinta el indicador global.

- [ ] **Step 1 (test):** `ipcPayload.test.mjs`: `failed` (push git) → `{ title:"No se pudo completar la subida", body incluye el label, action:"Reintentar" }`; `connection-lost` → `{ title:"Se perdió la conexión", ... }`. Mapeo determinista, es-AR.
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar `ipcPayload.mjs`; `preload.mjs` con `contextBridge` exponiendo `onToast/onConnectivity`; `main.mjs` conecta monitor+resilience → `win.webContents.send`. `overlay.js` recibe y (a) dispara el toast existente con botón Reintentar (que hace `creappDesktop.retry(id)`), (b) actualiza el indicador.
- [ ] **Step 4 (verify):** forzar una falla simulada → el toast central aparece con Reintentar; cortar una probe → indicador rojo + toast "Se perdió la conexión". Commit.

## Task 10: Edición quirúrgica del motor (reporta estado de subidas)

**Files (repo MOTOR `~/Desktop/PROYECTOS DEV/Creador de Contenidos`):**
- Modify: `src/core/collab.py` (el hook que hoy traga errores) y `src/web/app.py` (endpoint de estado)
- Test: `tests/test_collab_upload_status.py`

**Interfaces:**
- Produces: tras una subida (on_render_complete / subir_ahora), el motor registra `{ job_id, ok, error?, at }` del último intento en un store observable (en memoria + persist liviano), y `GET /api/collab/upload-status/{job_id}` lo devuelve. El hook deja de **tragar** el error: lo registra (sigue sin romper el render, pero el estado queda consultable).

- [ ] **Step 1 (test):** `test_collab_upload_status.py`: simular una subida que falla → el status del job queda `ok=False` con el motivo; una que anda → `ok=True`; el endpoint devuelve el último.
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar: en el `except` del hook, en vez de solo loguear, escribir el status; agregar el endpoint. NO cambiar el contrato existente (el render sigue sin propagar la excepción hacia arriba).
- [ ] **Step 4:** Verde (`pytest tests/test_collab_upload_status.py`). Commit en el repo motor (rama propia).

## Task 11: Cablear operaciones pesadas a la resiliencia

**Files:**
- Modify: `desktop/main.mjs`
- Create: `desktop/src/heavyOps.mjs`, `desktop/src/heavyOps.test.mjs`

**Interfaces:**
- Consumes: Task 8 (`runWithRetry`), Task 10 (status endpoint del motor), Task 9 (toast).
- Produces: `gitPush(config)`, `gitPull(config)` (spawn git en `creappPath`/`motorPath`), y `observeMotorUpload(config, jobId)` (poll al status endpoint hasta ok/falla). Cada una corre bajo `runWithRetry` y surfacea a toast.

- [ ] **Step 1 (test):** inyectar spawn/fetch: `gitPush` que falla (exit≠0) → `runWithRetry` emite `failed` con retry que reintenta; `observeMotorUpload` con status `ok=False` → `failed`; `ok=True` → `success`.
- [ ] **Step 2:** Correr, fallan.
- [ ] **Step 3:** Implementar `heavyOps.mjs`; en `main.mjs` exponer por IPC para que el overlay/acciones las disparen y el Reintentar las reintente.
- [ ] **Step 4:** Verde. Commit.

## Task 12: Packaging y verificación end-to-end

**Files:**
- Modify: `desktop/electron-builder.yml` (icono CreAPP de `src/assets`), `desktop/package.json`

**Interfaces:**
- Produces: `npm --prefix desktop run dist` genera `CreAPP Suite.app` (mac, unsigned).

- [ ] **Step 1:** Icono/branding CreAPP; `electron-builder --mac --dir`.
- [ ] **Step 2 (verify, manual):** doble clic en el `.app`: (a) con una dep faltante → ventana de preflight con la lista + fix; (b) con todo ok → arranca el motor, abre la UI CreAPP, se loguea; (c) cerrar la app → `lsof -i:8000` vacío (motor apagado, sin huérfano); (d) cortar wifi → indicador rojo + toast "Se perdió la conexión"; (e) un push que falla → toast con Reintentar que reintenta.
- [ ] **Step 3:** Documentar en `desktop/README.md` el setup (paths del config, `npm run build` del UI antes de arrancar). Commit.

---

## Notas de ejecución
- Tasks 1–9, 11, 12 viven en el repo CreAPP (`desktop/`). **Task 10 vive en el repo motor** (`Creador de Contenidos`) — rama propia, commit aparte.
- El orden respeta dependencias: 1→2→3→4→5→6 (ya abre la suite funcional sin resiliencia), luego 7→8→9→10→11 (capa de resiliencia), 12 cierra.
- Tras 6, hay un hito usable (preflight + motor + UI). La resiliencia se suma encima sin bloquear ese hito.
