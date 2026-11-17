# Preflight animado "Despegue CreAPP" + instalación guiada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Reemplazar la pantalla de preflight plana/técnica por una experiencia CreAPP: un cohete que se arma parte por parte mientras verifican las dependencias, lista de componentes animada, y —si falta algo— un modal-toast de error claro con botón "Instalar" que abre una terminal visible con el comando (errores a la vista).

**Architecture:** La lógica de comandos de instalación vive en un módulo puro testeable (`src/installCommands.mjs`), y `runPreflight` enriquece cada check con su comando `install`. El renderer (`renderer/preflight.html` + `preflight.js`) se rediseña: animación de cohete + lista escalonada (capa de presentación sobre el resultado que llega en bloque), y en fallo un modal-toast por componente faltante cuyo botón "Instalar" llama al bridge existente `window.creappDesktop.openMotorTerminal(cmd)`. Sin IPC nuevo.

**Tech Stack:** Electron (Node ESM `.mjs`), renderer HTML/CSS/JS vanilla con CSP estricta, `node --test` (`src/**/*.test.mjs`). macOS (osascript) para disparar terminal.

**Spec:** `docs/superpowers/specs/2026-11-16-preflight-cohete-animado-design.md`.

## Global Constraints

- **CSP del preflight** (`renderer/preflight.html`): `default-src 'self'; style-src 'unsafe-inline'`. Nada de assets externos/CDN; cohete en **SVG/CSS inline**; **sin `filter: drop-shadow`/`blur` en SVG** (glow por trazo concéntrico o box-shadow en HTML).
- **No cambiar** la lógica de los 8 checks ni el gate de arranque (el motor solo arranca si `runPreflight` da `ok`). Solo se AGREGA el campo `install` a cada check.
- **Reusar** `window.creappDesktop.openMotorTerminal(command)` (ya expuesto en el preload del preflight). NO agregar IPC, NO tocar `preload.mjs` ni `main.mjs`.
- **Solo macOS** dispara terminal (osascript, como hoy). En otra plataforma o si `openMotorTerminal` devuelve `{ok:false}`, el modal muestra el comando para copiar y un aviso, sin romper.
- **Tests**: `node --test 'src/**/*.test.mjs'` debe pasar. La lógica pura se testea; el renderer se verifica con `node --check` (sintaxis) + a ojo.
- **No commitear** ruido ajeno (`supabase/.temp/*`, el `preload.mjs` suelto en la raíz del repo fintech — este plan trabaja en `desktop/`).

## Review Focus

- **Comando de instalación correcto por componente:** cada `id` mapea al comando justo (ffmpeg/ffprobe→`brew install ffmpeg`, node→`brew install node`, python→`brew install python@3.12`, venv→`python -m venv .venv && pip install -r requirements.txt`, remotion→`cd src/remotion && npm install`); `paths`/`ui_build`→no instalable (sin botón). Test en Task 1.
- **El comando queda VISIBLE y corre:** lo que se manda a la terminal incluye un echo del comando antes de ejecutarlo, y la terminal queda abierta (si falla, el error se ve). Test del armado del string en Task 1/Task 3.
- **Fallback no-macOS / openMotorTerminal falla:** el botón "Instalar" no rompe si no hay terminal; muestra el comando para copiar. Verificación en Task 3.
- **La animación nunca queda trabada:** en `ok` despega y llama `proceed()`; en fallo muestra el modal + Reintentar; ante error de `runPreflight` muestra un estado de error con Reintentar. Verificación en Task 2/Task 3.
- **CSP:** sin recursos externos, sin `drop-shadow` en SVG. Verificación en Task 2.

---

### Task 1: `installCommands.mjs` + enriquecer `preflight.mjs` con el comando `install`

**Files:**
- Create: `src/installCommands.mjs`
- Modify: `src/preflight.mjs` (agregar `install` al objeto `result`)
- Create: `src/installCommands.test.mjs`
- Modify: `src/preflight.test.mjs` (asserts del nuevo campo)

**Interfaces:**
- Produces:
  - `installCommandFor(id: string) -> { installable: boolean, command: string | null }` en `installCommands.mjs`. `command` es el comando crudo de instalación (SIN el echo; el echo lo arma el renderer en Task 3), o `null`. Mapa: `python`→`brew install python@3.12`; `ffmpeg`/`ffprobe`→`brew install ffmpeg`; `node`→`brew install node`; `venv`→`python -m venv .venv && pip install -r requirements.txt`; `remotion_modules`→`cd src/remotion && npm install`; cualquier otro (`paths`, `ui_build`, desconocido)→`{ installable: false, command: null }`.
  - `preflight.mjs`: la función `result(id, label, ok, detail)` ahora devuelve también `install: installCommandFor(id).command` (string o null) y `installable: installCommandFor(id).installable`. (El resto del objeto —`id,label,ok,detail,fix`— intacto.)

- [ ] **Step 1: Write the failing tests**

```js
// src/installCommands.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { installCommandFor } from './installCommands.mjs';
test('brew para ffmpeg/ffprobe/node/python', () => {
  assert.equal(installCommandFor('ffmpeg').command, 'brew install ffmpeg');
  assert.equal(installCommandFor('ffprobe').command, 'brew install ffmpeg');
  assert.equal(installCommandFor('node').command, 'brew install node');
  assert.equal(installCommandFor('python').command, 'brew install python@3.12');
});
test('venv y remotion con contexto', () => {
  assert.match(installCommandFor('venv').command, /python -m venv \.venv && pip install -r requirements\.txt/);
  assert.equal(installCommandFor('remotion_modules').command, 'cd src/remotion && npm install');
});
test('paths/ui_build/desconocido no instalables', () => {
  for (const id of ['paths', 'ui_build', 'otro']) {
    const r = installCommandFor(id);
    assert.equal(r.installable, false);
    assert.equal(r.command, null);
  }
});
```
Y en `src/preflight.test.mjs` agregar un assert: un check fallido de `ffmpeg` trae `install === 'brew install ffmpeg'`; un check de `paths` trae `install === null`.

- [ ] **Step 2: Run tests to verify they fail** — `node --test 'src/**/*.test.mjs'` → FAIL (módulo/campo ausentes).
- [ ] **Step 3: Implementar** `installCommands.mjs` (el mapa) y enganchar `install`/`installable` en `result()` de `preflight.mjs`.
- [ ] **Step 4: Run tests** — PASS (todo el suite, incl. los preexistentes).
- [ ] **Step 5: Commit** — `feat(preflight): mapa de comandos de instalación por componente + enriquecer checks`.

---

### Task 2: Renderer — animación "cohete armándose" + lista animada + despegue (happy path)

**Files:**
- Modify: `renderer/preflight.html` (estructura + CSS del cohete/lista/animaciones, respetando la CSP)
- Modify: `renderer/preflight.js` (orquestación de la animación; `run()` sigue llamando `window.creapp.runPreflight()` y, en `ok`, `window.creapp.proceed()`)

**Interfaces:**
- Consumes: `window.creapp.runPreflight()` → `{ ok, checks:[{id,label,ok,detail,fix,install,installable}] }`; `window.creapp.proceed()`.
- Produces: el renderer dibuja el cohete que se ensambla por etapas y la lista de componentes con stagger; info técnica secundaria. En `ok`: anima el despegue y llama `proceed()`. Mantiene un camino de error si `runPreflight()` rechaza (texto + Reintentar). (El modal de componentes faltantes es Task 3 — en Task 2, `!ok` puede dejar el texto/stub existente; Task 3 lo reemplaza por el modal.)

- [ ] **Step 1:** rediseñar `preflight.html` (cohete SVG inline + contenedores de lista + keyframes CSS; sin assets externos; sin `drop-shadow` en SVG) y `preflight.js` (revelado escalonado de checks, ensamblado por etapas, despegue en `ok`→`proceed()`, estado de error si `runPreflight` rechaza).
- [ ] **Step 2: Verificar** `node --check renderer/preflight.js` (sintaxis OK) y `node --test 'src/**/*.test.mjs'` (lógica intacta, sin regresión).
- [ ] **Step 3: Commit** — `feat(preflight): animación cohete armándose + lista animada + despegue`.

*(Verificación visual a cargo del usuario; no hay harness de DOM.)*

---

### Task 3: Renderer — modal-toast de error + botón "Instalar" → terminal visible

**Files:**
- Modify: `renderer/preflight.html` (markup/estilos del modal-toast de error)
- Modify: `renderer/preflight.js` (render del modal en `!ok`, botón "Instalar", armado del comando con echo, fallback)
- Create: `src/terminalCommand.mjs` (+ `src/terminalCommand.test.mjs`) — armador puro y testeable del string que se manda a la terminal.

**Interfaces:**
- Consumes: `check.install` / `check.installable` (Task 1); `window.creappDesktop.openMotorTerminal(command)` (bridge existente; devuelve `{ ok, error? }`).
- Produces:
  - `buildInstallTerminalCommand(label: string, command: string) -> string` en `src/terminalCommand.mjs`: arma `echo "<explicación CreAPP de que se instala {label}>" && echo "> {command}" && {command}` — el comando queda **escrito** (segundo echo) y luego corre; comillas/escape seguros para el shell. Testeable.
  - En el renderer: si `result.ok === false`, se despliega un modal-toast CreAPP listando los componentes faltantes; cada uno instalable muestra botón **"Instalar"** que llama `openMotorTerminal(buildInstallTerminalCommand(label, check.install))`; los no instalables (`installable:false`) muestran la guía sin botón. Si `openMotorTerminal` devuelve `{ok:false}` (no-macOS, etc.), el modal muestra el comando para copiar + un aviso. Botón **"Reintentar"** re-corre `run()`.

- [ ] **Step 1: Write the failing test**

```js
// src/terminalCommand.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { buildInstallTerminalCommand } from './terminalCommand.mjs';
test('incluye el comando escrito (echo) y luego lo corre', () => {
  const out = buildInstallTerminalCommand('ffmpeg en PATH', 'brew install ffmpeg');
  // el comando aparece como texto (echo) Y como ejecución final
  assert.ok(out.includes('brew install ffmpeg'));
  assert.ok(/echo .+ && .*brew install ffmpeg$/s.test(out) || out.trim().endsWith('brew install ffmpeg'));
});
test('no deja romper comillas dobles del label', () => {
  const out = buildInstallTerminalCommand('a "b" c', 'brew install node');
  assert.ok(out.endsWith('brew install node'));
});
```

- [ ] **Step 2: Run test** — `node --test 'src/**/*.test.mjs'` → FAIL.
- [ ] **Step 3: Implementar** `terminalCommand.mjs`; luego el modal-toast + el botón "Instalar" + fallback en el renderer.
- [ ] **Step 4: Run** — `node --test` PASS; `node --check renderer/preflight.js` OK.
- [ ] **Step 5: Commit** — `feat(preflight): modal-toast de error con "Instalar" → terminal visible`.

---

## Notas de rollout

- Solo macOS dispara la terminal (igual que `openMotorTerminal` hoy). La UI degrada en otras plataformas mostrando el comando.
- No requiere cambios en `.env`, IPC, ni el flujo del motor. Es puramente la pantalla de arranque de la suite.
