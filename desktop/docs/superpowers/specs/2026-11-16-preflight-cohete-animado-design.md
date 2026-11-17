# Preflight animado "Despegue CreAPP" + instalación guiada de dependencias — Diseño

**Fecha:** 2026-11-16
**Repo:** CreAPP Desktop Suite (`creapp---fintech-innovation-hub/desktop`, Electron).
**Autor del concepto:** Seba (usuario).

## Intención y por qué

La pantalla de arranque de la suite ("CreAPP — Verificación inicial" / "Verificando tu entorno") hoy es una **lista plana, recta y técnica** de 8 checks (rutas, Python, venv, ffmpeg, ffprobe, Node, módulos de Remotion, build de la UI), con detalles técnicos crudos de entrada. Se siente sin vida y, si falta algo, el usuario queda con una instrucción de texto sin un camino claro para resolverlo.

Queremos que el arranque sea una **experiencia CreAPP de alto nivel**: una animación de carga temática donde un **cohete se arma parte por parte** a medida que cada dependencia verifica OK, con la lista de componentes apareciendo de forma animada y estética (la info técnica pasa a segundo plano, no de entrada). Y que **si falta un componente**, en vez de un texto frío, se despliegue un **modal-toast de error claro** con un mensaje amable, el instructivo, y un botón **"Instalar"** que abre una terminal visible con el comando de instalación.

## Metas / No-metas

**Metas:**
- Reemplazar la lista plana por una animación "cohete armándose" + lista de componentes animada/escalonada, estética CreAPP (oscuro + violeta/magenta).
- En todos-OK: el cohete **despega** y arranca la app (mantiene el gate actual: el motor solo arranca si el preflight da ok).
- Si falta ≥1 componente: modal-toast de error claro por componente — nombre, qué es/por qué hace falta (lenguaje humano), el instructivo, y botón "Instalar".
- "Instalar" → abre Terminal.app visible, hace **echo** de una explicación + el **comando exacto escrito**, y lo **corre**; como la terminal queda abierta, si el comando falla el error se ve ahí (decisión del usuario: comando visible en la terminal, errores a la vista).
- Mantener el "Reintentar" para re-verificar tras instalar.

**No-metas:**
- No cambiar la LÓGICA de los checks (`runPreflight` sigue devolviendo lo mismo + un campo nuevo de comando de instalación).
- No instalar en segundo plano silencioso (el usuario quiere ver la terminal y los errores).
- No tocar el flujo del motor/overlay ni otros archivos de la suite.
- Auto-resolver dependencias sin intervención: no. El usuario mira la terminal.
- Cross-platform: la instalación vía terminal es **solo macOS** (osascript), igual que `openMotorTerminal` hoy. En otra plataforma, el modal muestra el comando para copiar, sin botón que dispare terminal.

## A. Animación "cohete armándose" + lista de componentes

- Lienzo oscuro CreAPP (negro/grafito + acentos violeta→magenta), sin assets externos (la CSP del preflight es `default-src 'self'; style-src 'unsafe-inline'`): el cohete es **SVG inline / CSS**, sin `filter: drop-shadow` en SVG (glow por trazo concéntrico o box-shadow en HTML).
- A medida que llegan los checks OK, el cohete **se ensambla por etapas** (nariz → fuselaje → aletas → motores → ventana), cada etapa con un pop-in elástico; en paralelo, cada componente entra en la lista con **stagger** (0.12–0.25s) y su tilde animado. La info técnica (`detail`) queda secundaria: visible en hover o en una línea tenue, no como protagonista.
- Micro-movimiento continuo mientras carga (respiración suave del cohete, partículas/chispas tenues), nunca una placa estática.
- **Todos OK** → el cohete enciende motores y **despega** (sube y se disuelve), luego `proceed()` arranca la app. El texto pasa de "Ensamblando tu estación…" a "¡Despegue! Iniciando CreAPP…".
- **Nota técnica:** hoy `runPreflight` corre los 8 checks con `Promise.all` y devuelve todo junto. El ensamblado es una capa de **presentación**: la animación revela los componentes en secuencia aunque los datos lleguen en bloque (no se requiere streaming por-check).

## B. Modal-toast de error (componente faltante)

- Si `result.ok === false`: el cohete queda **incompleto** (las piezas de los componentes faltantes parpadean en rojo/ámbar) y se despliega un modal-toast CreAPP (glassmorphism, no un alert nativo).
- Por cada componente faltante: **nombre** (label), **mensaje humano** de qué es y por qué CreAPP lo necesita, el **instructivo** (el `fix` actual, reformulado claro), y un botón **"Instalar"** (solo si el componente es instalable por comando).
- Componentes **no instalables por comando** (`paths`, `ui_build`): muestran su guía sin botón "Instalar" (son config/build, no un `brew install`).
- Botón **"Reintentar"** para re-verificar tras instalar.

## C. "Instalar" → terminal visible

- Mapa por `id` de check → comando de instalación exacto (nuevo módulo testeable `src/installCommands.mjs`):
  - `python` → `brew install python@3.12`
  - `ffmpeg` / `ffprobe` → `brew install ffmpeg`
  - `node` → `brew install node`
  - `venv` → `python -m venv .venv && pip install -r requirements.txt` (corre en `motorPath`; `openMotorTerminal` ya hace `cd motorPath`)
  - `remotion_modules` → `cd src/remotion && npm install` (relativo a `motorPath`)
  - `paths`, `ui_build` → sin comando (no instalable) → `{ installable: false }`.
- El comando que se manda a la terminal se arma como: `echo "<explicación CreAPP de qué se instala>" && echo "> <comando>" && <comando>` — así el comando queda **escrito/visible** y, al correr, si falla el error se ve (la terminal queda abierta tras `do script`).
- La terminal se abre reusando el bridge existente: `window.creappDesktop.openMotorTerminal(fullCommand)` (ya expuesto en el preload del preflight; abre Terminal.app vía osascript, `cd motorPath && <command>`). **No** hace falta IPC nuevo ni tocar `preload.mjs`/`main.mjs`.
- `runPreflight` (en `src/preflight.mjs`) se enriquece: cada check lleva además `install` = el comando listo (o `null` si no instalable), computado con `installCommands.mjs`, de modo que el renderer solo lee `check.install` y lo pasa a `openMotorTerminal`. Toda la lógica de comandos queda en `src/*.mjs` testeable con `node --test`.

## Restricciones (Global Constraints)

- **CSP del preflight**: `default-src 'self'; style-src 'unsafe-inline'`. Nada de assets externos ni CDNs; cohete en SVG/CSS inline; sin `filter: drop-shadow` en SVG.
- **Solo macOS** para disparar terminal (osascript), igual que hoy; degradar en otras plataformas (mostrar comando, sin botón).
- **Reusar** `window.creappDesktop.openMotorTerminal` — no IPC nuevo, no tocar preload/main.
- **No cambiar** la lógica de los 8 checks ni el gate de arranque (motor solo si preflight ok).
- **Tests**: la lógica pura (`installCommands.mjs`, el enriquecido de `preflight.mjs`) se cubre con `node --test 'src/**/*.test.mjs'`. El renderer (animación/modal) se verifica a ojo (no hay harness de DOM).
- **Resiliencia**: si `openMotorTerminal` devuelve `{ok:false}` (ej. no-macOS), el modal muestra el comando para copiar y un aviso, sin romper.

## Qué queda a criterio del ejecutor

- El diseño visual exacto del cohete, sus etapas de ensamblado y la animación de despegue (SVG/CSS).
- El tono y el texto de los mensajes CreAPP (es-AR) de cada componente (qué es / por qué hace falta).
- El layout exacto del modal-toast de error.
- El fraseo del `echo` de explicación en la terminal.
