import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './src/config.mjs';
import { runPreflight } from './src/preflight.mjs';
import { makeRealDeps } from './src/real-deps.mjs';
import { startMotor, stopMotor } from './src/motor.mjs';

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
  win.loadFile(fileURLToPath(new URL('./renderer/preflight.html', import.meta.url)));
  return win;
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
      await stopMotor(motor);
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
