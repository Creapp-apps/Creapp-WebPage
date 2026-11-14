import { app, BrowserWindow, ipcMain, shell } from 'electron';
import http from 'node:http';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './src/config.mjs';
import { runPreflight } from './src/preflight.mjs';
import { makeRealDeps } from './src/real-deps.mjs';
import { startMotor, stopMotor } from './src/motor.mjs';
import { startUiServer } from './src/uiServer.mjs';
import { createMonitor } from './src/connectivity.mjs';
import { runWithRetry } from './src/resilience.mjs';
import { toToastPayload } from './src/ipcPayload.mjs';
import { createRealProbes } from './src/probes.mjs';
import fs from 'node:fs';

let mainWindow = null;
let uiServer = null;

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

let monitor = null;
function startConnectivity() {
  if (monitor) return;
  try {
    const cfg = loadConfig();
    const supabaseUrl = process.env.CREAPP_SUPABASE_URL || 'https://yjrqpjlzyxivwpfcatvt.supabase.co';
    const r2Url = process.env.CREAPP_R2_URL;
    if (!r2Url) {
      console.warn('[creapp] CREAPP_R2_URL no definida: monitor de conectividad desactivado');
      return;
    }
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
  motorStarting = startMotor(loadConfig());
  try {
    motor = await motorStarting;
    motor.onLog((line) => {
      motorLogs.push(line);
      if (motorLogs.length > 500) motorLogs.shift();
    });
    console.log(`[creapp] motor listo en :${motor.port}`);
    const cfg = loadConfig();
    uiServer = await startUiServer(cfg, { http, fs: fsp });
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(uiServer.url);
    startConnectivity();
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
