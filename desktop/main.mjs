import { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu, nativeImage } from 'electron';
import http from 'node:http';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './src/config.mjs';
import { runPreflight } from './src/preflight.mjs';
import { makeRealDeps } from './src/real-deps.mjs';
import { startMotor, stopMotor } from './src/motor.mjs';
import { startUiServer } from './src/uiServer.mjs';
import { buildWebUi } from './src/webBuild.mjs';
import { openMotorTerminal } from './src/openMotorTerminal.mjs';
import { createMonitor } from './src/connectivity.mjs';
import { runWithRetry } from './src/resilience.mjs';
import { toToastPayload } from './src/ipcPayload.mjs';
import { createRealProbes } from './src/probes.mjs';
import { gitPush, gitPull, observeMotorUpload } from './src/heavyOps.mjs';
import { startPreflightWatch, preflightDeepLink } from './src/preflightWatch.mjs';
import { startJobsActiveWatch, applyMotorStatus } from './src/jobsActiveWatch.mjs';
import { createPtyTerminal } from './src/ptyTerminal.mjs';
import fs from 'node:fs';

let mainWindow = null;
let uiServer = null;
let tray = null;
let stopJobsWatch = null;

const preloadPath = fileURLToPath(new URL('./preload.mjs', import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox:false: el preload es ESM (.mjs) y un renderer sandboxed no puede cargar preloads ESM.
      sandbox: false,
    },
  });
  // Links externos y del Estudio del motor (localhost:8000) → navegador por defecto.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });
  // Inyecta el overlay (toast + indicador) solo en la UI de CreAPP, no en el preflight.
  // Firma Electron 33: (event, url, isInPlace, isMainFrame, ...). Las navegaciones in-place
  // (pushState de react-router, SPA) NO recargan la página ni disparan did-finish-load:
  // el overlay DOM sobrevive, así que no hay que marcarlo como no listo.
  win.webContents.on('did-start-navigation', (_e, _url, isInPlace, isMain) => {
    if (isMain && !isInPlace) overlayReady = false;
  });
  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL();
    if (!/^https?:\/\//i.test(url)) return;
    const code = fs.readFileSync(fileURLToPath(new URL('./renderer/overlay.js', import.meta.url)), 'utf8');
    win.webContents.executeJavaScript(code).then(() => {
      overlayReady = true;
      // Replay: estado de conectividad actual (null = sin monitoreo) + toasts pendientes.
      win.webContents.send('desktop:connectivity', lastConnectivity ?? { online: null });
      win.webContents.send('desktop:motor-status', lastMotorStatus ?? { active: false, count: 0, chipText: '', windowTitle: 'CreAPP Suite', trayTitle: '' });
      for (const t of pendingToasts.splice(0)) win.webContents.send('desktop:toast', t);
    }).catch((e) => console.error('[creapp] overlay:', e.message));
  });
  win.loadFile(fileURLToPath(new URL('./renderer/preflight.html', import.meta.url)));
  mainWindow = win;
  return win;
}

// Bridge main -> renderer: toasts y conectividad. Los retry() de eventos `failed`
// viven en este mapa (id -> callback); el renderer solo conoce el id.
const pendingRetries = new Map();
const MAX_PENDING = 50;
let retrySeq = 0;
let lastConnectivity = null;
let lastMotorStatus = null;
let overlayReady = false;
const pendingToasts = []; // toasts emitidos antes de que el overlay esté cargado
const sendToRenderer = (channel, payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!overlayReady) {
    if (channel === 'desktop:toast') {
      pendingToasts.push(payload);
      if (pendingToasts.length > 20) pendingToasts.shift();
    }
    return;
  }
  mainWindow.webContents.send(channel, payload);
};

// Para operaciones del main que quieran falla visible + Reintentar.
export function runResilient(op, label, opts = {}) {
  return runWithRetry(op, {
    ...opts,
    label,
    onEvent: (evt) => {
      if (evt.type !== 'failed') return;
      const payload = toToastPayload(evt);
      if (!payload) return;
      const id = ++retrySeq;
      pendingRetries.set(id, evt.retry);
      if (pendingRetries.size > MAX_PENDING) pendingRetries.delete(pendingRetries.keys().next().value);
      sendToRenderer('desktop:toast', { ...payload, id });
    },
  });
}

// Operaciones pesadas: corren bajo runResilient (falla -> toast + Reintentar).
// Fire-and-forget: runResilient queda pendiente hasta que la op funcione, así que
// el invoke devuelve enseguida; el resultado/falla se ve por el toast.
const GIT_TIMEOUT_MS = 60000;
const HEAVY_OPS = {
  'desktop:git-push': () => ['git push', () => gitPush(loadConfig())],
  'desktop:git-pull': () => ['git pull', () => gitPull(loadConfig())],
};
for (const [channel, make] of Object.entries(HEAVY_OPS)) {
  ipcMain.handle(channel, () => {
    const [label, op] = make();
    // timeoutMs: un git colgado se detecta como intermitencia (toast + Reintentar).
    runResilient(op, label, { timeoutMs: GIT_TIMEOUT_MS });
    return { started: true };
  });
}
ipcMain.handle('desktop:observe-upload', (_e, jobId) => {
  if (typeof jobId !== 'string' || !jobId) return { started: false };
  runResilient(() => observeMotorUpload(loadConfig(), jobId), `subida ${jobId}`, { timeoutMs: 150000 });
  return { started: true };
});

// Abre una terminal en el repo del motor (lee el .mcp.json solo) y lanza la IA elegida.
ipcMain.handle('desktop:open-motor-terminal', (_e, command) => {
  try {
    return openMotorTerminal(loadConfig(), command);
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});

ipcMain.on('desktop:retry', (_e, id) => {
  const retry = pendingRetries.get(id);
  if (!retry) return;
  pendingRetries.delete(id);
  try {
    Promise.resolve(retry()).catch((err) => console.error('[creapp] retry:', err?.message ?? err));
  } catch (err) {
    console.error('[creapp] retry:', err?.message ?? err);
  }
});
ipcMain.on('desktop:dismiss', (_e, id) => { pendingRetries.delete(id); });

// ── Terminal embebido (PTY en el main, xterm en el renderer) ──────────────
let ptyTerm = null;
function sendTerm(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}
ipcMain.handle('term:start', async (_e, { cols, rows } = {}) => {
  if (ptyTerm) return { ok: true, already: true };
  try {
    const { loadConfig } = await import('./src/config.mjs');
    ptyTerm = await createPtyTerminal({
      cwd: loadConfig().motorPath,
      env: process.env,
      onData: (d) => sendTerm('term:data', d),
      onExit: (ex) => { sendTerm('term:exit', ex); ptyTerm = null; },
    });
    if (cols && rows) ptyTerm.resize(cols, rows);
    return { ok: true };
  } catch (err) {
    console.error('[creapp] terminal embebido no arrancó:', err?.message ?? err);
    ptyTerm = null;
    return { ok: false, error: String(err?.message ?? err) };
  }
});
ipcMain.on('term:write', (_e, data) => { ptyTerm?.write(data); });
ipcMain.on('term:resize', (_e, { cols, rows } = {}) => { if (cols && rows) ptyTerm?.resize(cols, rows); });
ipcMain.on('term:dispose', () => { ptyTerm?.dispose(); ptyTerm = null; });

let monitor = null;
function startConnectivity() {
  if (monitor) return;
  try {
    const cfg = loadConfig();
    const supabaseUrl = process.env.CREAPP_SUPABASE_URL || cfg.supabaseUrl;
    const r2Url = process.env.CREAPP_R2_URL || cfg.r2Url;
    monitor = createMonitor({ probes: createRealProbes({ supabaseUrl, r2Url, creappPath: cfg.creappPath }) });
  } catch (err) {
    console.error('[creapp] monitor no arrancó:', err.message);
    return;
  }
  monitor.on('change', (s) => { lastConnectivity = s; sendToRenderer('desktop:connectivity', s); });
  monitor.on('connection-lost', () => sendToRenderer('desktop:toast', toToastPayload({ type: 'connection-lost' })));
  monitor.on('monitor-error', (err) => console.error('[creapp] monitor-error:', err?.message ?? err));
  monitor.start();
}

// Gate: el motor solo arranca si el preflight (corrido en el main) dio ok.
// Un evento del renderer por sí solo no alcanza.
let preflightOk = false;
let motor = null;
let motorStarting = null;
const motorLogs = [];

ipcMain.handle('preflight:run', async () => {
  const result = await runPreflight(loadConfig(), makeRealDeps());
  preflightOk = result.ok === true;
  return result;
});

async function launchMotor() {
  if (!preflightOk || motor || motorStarting) return;
  const cfg = loadConfig();
  motorStarting = startMotor(cfg);
  // Rebuild de la UI en paralelo al arranque del motor: el dist servido no debe
  // quedar viejo respecto al código. Resiliente: si falla, servimos el dist previo.
  const building = buildWebUi(cfg);
  try {
    motor = await motorStarting;
    motor.onLog((line) => {
      motorLogs.push(line);
      if (motorLogs.length > 500) motorLogs.shift();
    });
    console.log(`[creapp] motor listo en :${motor.port}`);
    const build = await building;
    if (!build.ok) console.error(`[creapp] rebuild UI falló, sirvo dist previo: ${build.error}`);
    else console.log('[creapp] UI rebuildeada');
    uiServer = await startUiServer(cfg, { http, fs: fsp });
    // Arranque directo al área de agencia: sin sesión, AuthGuard redirige a
    // /admin/login; con sesión activa, entra al panel. Nunca la landing pública.
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(uiServer.url + 'admin');
    startConnectivity();
    // Avisa (notificación nativa + badge del dock) cuando una campaña queda lista
    // para revisar en el pre-flight, así no se autoriza ninguna sin revisarla.
    startPreflightWatch({
      motorPort: motor.port,
      intervalMs: 20000,
      notify: (c) => {
        try {
          const n = new Notification({
            title: 'Nuevo preflight disponible',
            body: `${c.business_name || c.client_id} · ${c.campaign_id}`,
          });
          // Click del banner nativo → traer la ventana al frente y abrir el deep-link
          // del pre-flight de esa campaña (full reload del SPA a la ruta).
          n.on('click', () => {
            try {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                mainWindow.focus();
                if (uiServer) mainWindow.loadURL(preflightDeepLink(uiServer.url, c.campaign_id));
              }
            } catch { /* click best-effort */ }
          });
          n.show();
        } catch { /* notificación best-effort */ }
      },
      setBadge: (n) => {
        try { app.dock?.setBadge(n ? String(n) : ''); } catch { /* macOS only */ }
      },
    });
    // Estado en vivo del motor: qué pieza procesa (overlay chip + título + Tray).
    // NO toca el dock badge (lo usa el preflight watcher de arriba).
    stopJobsWatch = startJobsActiveWatch({
      motorPort: motor.port,
      onStatus: (s) => {
        lastMotorStatus = s;
        applyMotorStatus(s, {
          send: (ch, p) => sendToRenderer(ch, p),
          setTitle: (t) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(t); },
          setTray: (title, tip) => { if (tray) { tray.setTitle(title); tray.setToolTip(tip); } },
        });
      },
    });
  } catch (err) {
    console.error(`[creapp] motor no arrancó: ${err.message}${err.code != null ? ` (code ${err.code})` : ''}`);
  } finally {
    motorStarting = null;
  }
}

ipcMain.on('app:proceed', () => {
  app.emit('app:proceed');
});
app.on('app:proceed', () => { launchMotor(); });

// Sin huérfanos: esperamos el exit de uvicorn antes de cerrar.
let quitting = false;
app.on('before-quit', (e) => {
  if (quitting) return;
  // Matar el PTY del terminal embebido siempre (incluso si el motor no corría).
  if (ptyTerm) { try { ptyTerm.dispose(); } catch { /* ignore */ } ptyTerm = null; }
  if (stopJobsWatch) { try { stopJobsWatch(); } catch { /* ignore */ } stopJobsWatch = null; }
  if (tray) { try { tray.destroy(); } catch { /* ignore */ } tray = null; }
  const pending = motorStarting;
  if (!motor && !pending) return;
  e.preventDefault();
  quitting = true;
  (async () => {
    try {
      if (!motor && pending) await pending.catch(() => {});
      if (monitor) monitor.stop();
      await stopMotor(motor);
      if (uiServer) await uiServer.close();
    } finally {
      app.quit();
    }
  })();
});

app.whenReady().then(() => {
  createWindow();
  // Tray en la barra de menú: refleja el estado del motor (texto en macOS vía setTitle).
  try {
    tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip('CreAPP Suite');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir CreAPP Suite', click: () => { if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() },
    ]));
  } catch { /* tray best-effort (headless/CI) */ }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
