# Estado en vivo del motor en la CreAPP Suite (Electron) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Mostrar en la desktop app, en vivo, qué pieza está procesando el motor: un chip de fase en el chrome + reflejo en título de ventana y Tray ("Renderizando…"), polleando `GET /api/jobs/active`; y re-tematizar la terminal embebida a la estética CreAPP (negro + violeta).

**Architecture:** Un watcher nuevo en el main process (`desktop/src/jobsActiveWatch.mjs`, calcado de `preflightWatch.mjs`: core puro + inyectables) pollea `http://127.0.0.1:${motorPort}/api/jobs/active` cada 1.5s. En cada tick empuja el estado al renderer por IPC (`desktop:motor-status`) para el chip del overlay, y actualiza título de ventana + Tray. La terminal (React, repo web) se re-tematiza en su componente.

**Tech Stack:** Electron (ESM `.mjs`), node:test, xterm.js (`@xterm/xterm`), React/TS (web app).

**Spec:** `/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos/docs/superpowers/specs/2026-11-22-motor-play-by-play-desktop-design.md` §5–6 (lado Electron). El backend ya está mergeado y sirve el contrato.

## Global Constraints

- Endpoint: `http://127.0.0.1:${motorPort}/api/jobs/active` (motorPort de `desktop/src/config.mjs`, default 8000). Responde array plano `[{job_id, client_id, display_name, current_step_label, current_step_status, updated_at}]`; array vacío = nada procesando.
- Poll cada **1500 ms**, primer tick inmediato, **errores tragados** (motor caído → reintenta; se trata como idle).
- **NO escribir `app.dock.setBadge`** — ya lo usa `preflightWatch` (main.mjs:254) para el contador de pending-review. El indicador de render va por **`mainWindow.setTitle(...)` + un `Tray` nuevo** (`tray.setTitle`/`setToolTip`). Ambos se resetean a idle con array vacío.
- Marca: negro **`#070709`**, violeta **`#A855F7`**. El overlay hardcodea esos dos hex (se inyecta en otro contexto); la terminal (lee `@theme`) usa esos valores.
- Copy es-AR: el texto de fase viene del motor (`current_step_label`); el lado Electron **no inventa copy**, solo compone ("Motor · N piezas", título).
- Patrón de test del repo: core puro + fetch/timers/efectos inyectados; `node --test 'src/**/*.test.mjs'` (`npm test` en `desktop/`). Tests co-located `desktop/src/*.test.mjs`.
- IPC: canal `desktop:motor-status`, push vía helper `sendToRenderer` (main.mjs:77); suscripción `onMotorStatus` en el namespace `creappDesktop` (preload.mjs), reusando el helper `subscribe(channel)`.
- El chip del overlay es `position:fixed; pointer-events:none` (no debe bloquear clics), clonando la píldora de conectividad existente.

## Review Focus

- **Motor caído / fetch lanza:** el poller traga el error y emite estado idle (título/tray/chip se limpian), reintenta al siguiente tick. → Task 1.
- **Array vacío → idle:** título reset a "CreAPP Suite", tray vacío, chip oculto. → Task 1 (reducer) + Task 3 (chip hide).
- **N>1 piezas:** chip "Motor · N piezas" y título coherente, sin romper. → Task 1 reducer.
- **Chip no bloquea clics:** `pointer-events:none` en el chip igual que el root del overlay. → Task 3.
- **Ciclo de vida del Tray:** se crea una sola vez, se destruye al salir; no se duplica en re-launch. → Task 2.

---

### Task 1: `jobsActiveWatch.mjs` — reducer puro + poller inyectable

**Files:**
- Create: `desktop/src/jobsActiveWatch.mjs`
- Test: `desktop/src/jobsActiveWatch.test.mjs`

**Interfaces:**
- Produces:
  - `motorStatusFrom(jobs: Array) -> { active: boolean, count: number, chipText: string, windowTitle: string, trayTitle: string }`
  - `startJobsActiveWatch({ motorPort, intervalMs = 1500, fetchJson, timers = { setInterval, clearInterval }, onStatus }) -> { stop: () => void }`

- [ ] **Step 1: Write failing tests** `desktop/src/jobsActiveWatch.test.mjs` (node:test):
  - `motorStatusFrom([])` → `{active:false, count:0, chipText:'', windowTitle:'CreAPP Suite', trayTitle:''}`.
  - `motorStatusFrom([{display_name:'Cardoso · reel 02', current_step_label:'Generando voz…'}])` → `active:true`, `count:1`, `chipText:'Motor · Cardoso · reel 02 · Generando voz…'`, `windowTitle:'Generando voz… — CreAPP Suite'`, `trayTitle` starts with `'● '` and length ≤ 30.
  - `motorStatusFrom([a,b,c])` → `count:3`, `chipText:'Motor · 3 piezas'`, `windowTitle:'Renderizando 3 piezas — CreAPP Suite'`.
  - `motorStatusFrom(null)` and a job missing `display_name`/`current_step_label` → no throw, sensible defaults.
  - poller: injected `fetchJson` returning `[one job]` → `onStatus` called (immediate tick) with the reduced object; injected `fetchJson` that throws → `onStatus` called with the empty/idle object (error swallowed); `timers` fake drives subsequent ticks; `stop()` calls `clearInterval`.

- [ ] **Step 2: Run** `cd desktop && npm test` → FAIL (module missing).

- [ ] **Step 3: Implement** `motorStatusFrom` and `startJobsActiveWatch` in `desktop/src/jobsActiveWatch.mjs`, mirroring the shape of `desktop/src/preflightWatch.mjs` (pure reducer + injectable poller; immediate first tick; try/catch around fetch that falls back to `motorStatusFrom([])`). `fetchJson(url)` is injected (in prod: a small wrapper over `fetch` with a short timeout). Clamp `trayTitle` to ≤ 30 chars.

- [ ] **Step 4: Run** `cd desktop && npm test` → PASS.

- [ ] **Step 5: Commit** `feat(desktop): jobsActiveWatch — poller + reducer de estado del motor`.

---

### Task 2: Wire watcher + Tray + window title en `main.mjs`

**Files:**
- Modify: `desktop/main.mjs`

**Interfaces:**
- Consumes: `startJobsActiveWatch`, `motorStatusFrom` (Task 1); existing `sendToRenderer` (main.mjs:77), `loadConfig`/`motorPort` (config.mjs), `mainWindow`.

- [ ] **Step 1: Implement Tray.** Import `Tray, nativeImage` from electron. In the `whenReady` block (~main.mjs:292), after the window exists, create a module-scoped `tray = new Tray(nativeImage.createEmpty())` (empty image; macOS shows `setTitle` text in the menubar) with a minimal context menu (e.g. "Abrir CreAPP Suite" → focus window, "Salir"). Guard against double-create.

- [ ] **Step 2: Implement the status handler + start the watch.** In `launchMotor()`, next to the existing `startPreflightWatch(...)` call (~main.mjs:231-257), start `startJobsActiveWatch({ motorPort, fetchJson, onStatus })` where `onStatus(s)` does:
  - `sendToRenderer('desktop:motor-status', s)`
  - `mainWindow?.setTitle(s.windowTitle)`
  - `tray?.setTitle(s.active ? s.trayTitle : '')`; `tray?.setToolTip(s.active ? s.trayTitle : 'CreAPP Suite')`
  - **Never** call `app.dock.setBadge` here (owned by preflight).
  Reuse the repo's existing `fetchJson` helper if one exists; otherwise a tiny `fetch`+timeout wrapper.

- [ ] **Step 3: Tray lifecycle.** Destroy the tray on `before-quit` (`tray?.destroy()`); ensure the watch's `stop()` is called on quit. Don't duplicate the tray if `launchMotor` can re-run.

- [ ] **Step 4: Verify (manual — no node:test for main.mjs).** `cd desktop && npm start`; with the motor up and a piece rendering (trigger via the web UI or motor MCP), confirm: window title shows the phase, the menubar Tray shows "● …", and both clear when nothing runs. Record what you saw in the task report.

- [ ] **Step 5: Commit** `feat(desktop): title + Tray reflejan el estado del motor (sin pisar el dock badge)`.

---

### Task 3: Canal IPC + chip en el overlay

**Files:**
- Modify: `desktop/preload.mjs`
- Modify: `desktop/renderer/overlay.js`

**Interfaces:**
- Consumes: the `desktop:motor-status` payload pushed by Task 2 (`{active, count, chipText, windowTitle, trayTitle}`); the `subscribe(channel)` helper (preload.mjs:9-13); the overlay `root` + `dot` pill pattern (overlay.js:12-19).

- [ ] **Step 1: preload channel.** Add `onMotorStatus: subscribe('desktop:motor-status')` to the `creappDesktop` object (preload.mjs:14-23), reusing the existing `subscribe` helper verbatim.

- [ ] **Step 2: overlay chip.** In `desktop/renderer/overlay.js`, clone the connectivity `dot` pill into a `motorChip` (same CSS: `border-radius:999px; background:#070709; border:1px solid #A855F7; color:#fff; font-size:12px; pointer-events:none`), anchored `right:12px; bottom:48px` (above the connectivity pill), with a violet LED `<span>` + a text `<span>`. Append it to `root`. Subscribe: `api.onMotorStatus((s) => { if (!s || !s.active) { motorChip.style.display = 'none'; } else { motorChip.style.display = 'flex'; txt.textContent = s.chipText; } })`. Idle → hidden.

- [ ] **Step 3: Verify (manual).** `cd desktop && npm start`; confirm the chip appears with the phase text while a piece renders, hides when idle, and does not block clicks on the UI underneath (`pointer-events:none`). Record in the report.

- [ ] **Step 4: Commit** `feat(desktop): chip de estado del motor en el overlay (IPC onMotorStatus)`.

---

### Task 4: Re-theme de la terminal embebida (repo web)

**Files:**
- Modify: `src/components/terminal/EmbeddedTerminal.tsx` (lines ~30-35, container ~66)

**Interfaces:**
- Consumes: CreAPP `@theme` tokens (`src/index.css`): `--color-background #070709`, `--color-primary #A855F7`.

- [ ] **Step 1: Implement theme.** Set the xterm `Terminal({ theme })` to CreAPP: `background:'#070709'` (o `#050505`), `foreground:'#ECECEF'`, `cursor:'#A855F7'`, `cursorAccent:'#070709'`, `selectionBackground:'rgba(168,85,247,0.30)'`. Keep a mono font (optionally tie to the brand stack) and `fontSize:13`. Add container padding (e.g. `padding:'8px 10px'` on the wrapper div at ~line 66, or a CSS override of `.xterm .xterm-screen`) so text doesn't touch the edges.

- [ ] **Step 2: Verify (manual — visual, web app has no node:test for this).** Rebuild/run the web UI (the desktop `npm start` rebuilds it, or `npm run dev` in the web repo) and confirm the terminal background/cursor/selection match CreAPP black+violet and padding looks right. Record in the report.

- [ ] **Step 3: Commit** `feat(web): terminal embebida re-tematizada a CreAPP (negro + violeta)`.

---

## Notas de integración
- Dock badge: queda 100% para preflight (pending-review). El render se ve por título de ventana + Tray + chip. Si más adelante se quiere también un glifo en el Dock, hay que coordinar las dos señales deliberadamente (fuera de alcance aquí).
- Verificación end-to-end: con el motor arriba y el backend ya mergeado, disparar una pieza y ver chip + título + tray moverse; `curl localhost:8000/api/jobs/active` como fuente de verdad.
