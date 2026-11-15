# CreAPP Desktop Suite — Documento de diseño

**Fecha:** 2026-11-14
**Estado:** pendiente de aprobación del usuario → luego plan (superpowers:writing-plans)

## Intención y por qué
Hoy, para trabajar con el motor de contenido hay que: abrir una terminal, correr `uvicorn` (motor), correr `npm run dev` (UI CreAPP) y abrir el navegador. Para una agencia de 2 personas eso es fricción y fuente de errores.

La **suite desktop** reemplaza todo eso por **un ícono de doble clic**: una app de escritorio que arranca el motor y la UI juntos, y desde la cual se usa el motor creador de contenidos. El render pesado (Remotion: Chromium + FFmpeg) **sigue siendo local en cada máquina** — por eso la app es de escritorio, no cloud.

## Qué NO cambia
Supabase (estado compartido) y R2 (media) siguen siendo la nube compartida. La suite desktop **no los reemplaza**: los usa igual que la web. La UI de CreAPP (React) **no se reescribe**: la app la carga tal cual.

## Decisión de alcance (del usuario, 2026-11-14)
**Cáscara prolija encima del entorno de desarrollo existente**, NO un instalador 100% autónomo. La máquina donde corre la suite DEBE tener todas las dependencias instaladas. Si falta alguna, la app muestra un **error de preflight** listando exactamente qué falta (y cómo instalarlo), y no arranca hasta resolverlo.

- **No-goal:** instalador firmado/distribuible (`.dmg`/`.exe` que bundlea Python/Chromium), auto-update, code signing. Fuera de alcance por decisión explícita.
- **No-goal:** reescribir la UI o el motor **de cero**. SÍ se permiten **ediciones quirúrgicas de resiliencia** (ver Resoluciones): que el motor deje de tragarse errores de subida y reporte estado. No es reescritura.
- **Solo macOS** (decisión del usuario, 2026-11-14). Las dos máquinas (Seba y Facu) son Mac. Windows fuera de alcance: simplifica spawn, paths (`.venv/bin`), SIGTERM y packaging a un solo target.

## Arquitectura

### Cáscara: Electron (decisión del diseñador)
Electron sobre Tauri: un solo toolchain (Node, que el equipo ya usa), `child_process` nativo para lanzar el motor y correr los chequeos de dependencias, integración simple. Tauri sería más liviano pero suma el toolchain de Rust sin beneficio real para una herramienta interna.

### Ubicación
Nuevo folder **`desktop/`** dentro del repo CreAPP (`creapp---fintech-innovation-hub/desktop/`). La app orquesta DOS repos locales:
- **CreAPP UI** (este repo) — la cara de la suite.
- **Motor** (`Creador de Contenidos`, Python/FastAPI) — el backend de render.

### Config de paths (decisión del diseñador)
La app necesita saber dónde están los dos repos. Default a las ubicaciones conocidas (`~/Desktop/PROYECTOS DEV/Creador de Contenidos` y el propio repo CreAPP), **overridable por un archivo de settings** (`~/.creapp-desktop/config.json`). En la máquina de Facu, setea sus paths una vez. Si un path no existe → entra en el error de preflight.

### Flujo de arranque
1. **Preflight de dependencias** (ver lista abajo). Si algo falta → pantalla de error con la lista exacta + cómo instalar. No avanza.
2. Si OK → **spawnea el motor** (uvicorn del venv del repo Creador) como proceso hijo en `localhost:8000`. Espera a que responda `/` (healthcheck) con timeout.
3. Abre la **ventana principal** cargando la UI de CreAPP (build local de producción servida por Electron — self-contained, habla con Supabase/R2 en la nube; se actualiza con `git pull && npm run build`).
4. Los links "Estudio" del motor (`localhost:8000/...`, ya cableados en `motorStudio.ts`) funcionan porque el motor está corriendo. Abren en ventana Electron o navegador.
5. **Al cerrar:** frena el proceso hijo del motor de forma ordenada (SIGTERM).

### Preflight — dependencias a chequear
Cada ítem faltante se muestra con nombre + una línea de cómo instalarlo:
- **Python 3.9+** disponible en PATH (o en el venv del motor).
- **venv del motor** existe (`<motor>/.venv`) con deps instaladas (chequear un import clave, ej. `fastapi`).
- **ffmpeg** y **ffprobe** en PATH.
- **node** disponible.
- **node_modules de Remotion** presentes (`<motor>/src/remotion/node_modules`).
- **Paths de los dos repos** existen (del config).
- (post-spawn) el motor responde en `:8000` dentro del timeout.

## Resiliencia de red y notificaciones (decisión del usuario, 2026-11-14)
Todo lo que depende de internet se mide y determina **en tiempo real**. Ninguna subida/bajada de información puede fallar en silencio.

- **Monitor de conectividad en vivo:** la suite muestra estado real de la red y de los servicios que usa (Supabase, R2, git remoto) — online/offline + alcanzable/no. Indicador siempre visible.
- **Toda operación de red con reintento:** cada `push`/`pull` de git, cada subida/bajada a R2, cada sync con Supabase y cada subida del motor se envuelve para detectar falla **o intermitencia** durante el proceso.
- **Notificación clara ante falla/intermitencia:** si algo no se puede completar (ej. el push no termina, se corta la subida a R2, timeouts), se muestra un **modal toast central** claro y directo con el motivo, y un botón **"Reintentar"**. Reusa el sistema de toast central existente de CreAPP (glassmorphism, intercepta `window.alert`; ver memoria del proyecto) — nada de alertas nativas del navegador/SO.
- **Cobertura:** aplica tanto a las operaciones del lado UI (React, sus propias lecturas/escrituras a Supabase) como a las del lado motor (Python: `push` a R2/Supabase, git). El shell de Electron captura la salud/errores del motor y los surfacea al mismo sistema de toast.
- **Refuerza la decisión de build local:** la UI abre y funciona aunque la red esté caída o intermitente; las operaciones de red degradan con aviso + reintento, no bloquean la app.

## Resoluciones del builder-check (decisiones del usuario, 2026-11-14)
1. **Edits quirúrgicos al motor: SÍ en scope.** Para que ninguna subida falle en silencio, el motor debe reportar éxito/falla de sus subidas. Mínimo: el hook post-render que hoy "nunca propaga errores" (`collab.on_render_complete` / `_collab_render_done`) debe registrar el estado (ok/falla/motivo) en un lugar observable, y la suite dispara/observa las subidas pesadas por un endpoint del motor que devuelve estado. "Reintentar" re-invoca esa operación. No se reescribe el motor; se destapan y exponen sus errores.
2. **Cobertura del toast-con-reintento: operaciones pesadas + indicador global + alerta por pérdida de conexión.**
   - Operaciones pesadas envueltas con detección de falla/intermitencia + reintento: subidas del motor a R2/Supabase, `git push`/`pull`.
   - **Indicador global de conectividad** siempre visible (estado real de red + Supabase + R2 + git remoto).
   - **Alerta (toast central) cuando se pierde la conexión** (el latido pasa a rojo), además del toast ante una operación activa que falla.
   - Las llamadas chicas de la UI a Supabase **mantienen su manejo actual** (ya tienen el toast existente); NO se instrumenta cada llamada React — eso sería reescribir la UI, fuera de alcance.
3. **Solo macOS** (ver no-goals).

### Decisiones del diseñador (confirmadas, no vetadas)
- **Carga de la UI:** mini-servidor estático dentro de Electron main sirve el build de la UI; la ventana hace `loadURL('http://localhost:PORT')`. Así `BrowserRouter` (react-router v7, `base:'/'`) anda sin tocar la UI (`file://` rompería el router y los `/assets`).
- **Medición de conectividad en tiempo real:** chequeos livianos por servicio (Supabase REST, R2 endpoint, `git ls-remote` al remoto) en un latido cada ~20-30s + detección por operación activa. El toast salta ante (a) una operación activa que falla/intermite, o (b) el latido que detecta pérdida de conexión. El indicador muestra el estado del latido.
- **Puente de avisos:** las fallas del motor/shell nacen en el proceso **main** de Electron; se llevan al toast del **renderer** (sistema existente) por un bridge IPC main→renderer.

## Qué queda para el builder (lo que el plan define)
- Comando de arranque del motor **confirmado**: `<motor>/.venv/bin/uvicorn src.web.app:app --port 8000` (sin `--reload` en producción desktop). FastAPI app en `src/web/app.py`. `main.py` es el CLI Typer (otra cosa).
- Estructura del proyecto Electron (main process, preload, ventana de preflight, ventana principal).
- Empaquetado con electron-builder para generar el `.app`/`.exe` (sin firma).
- Manejo de logs del motor (mostrarlos en la app para debug).
- Icono/branding CreAPP.

## Criterio de hecho
Doble clic en el `.app` → si faltan deps, error claro con la lista; si están todas, arranca el motor + abre la suite CreAPP en una ventana, y se puede renderizar contenido local. Al cerrar, el motor se apaga. Funciona en la máquina de Seba y en la de Facu (con sus paths).
