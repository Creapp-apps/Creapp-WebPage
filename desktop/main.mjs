import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './src/config.mjs';
import { runPreflight } from './src/preflight.mjs';
import { makeRealDeps } from './src/real-deps.mjs';

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

ipcMain.handle('preflight:run', () => runPreflight(loadConfig(), makeRealDeps()));

// Preflight OK: la Task 5 engancha acá el arranque del motor.
ipcMain.on('app:proceed', () => {
  app.emit('app:proceed');
});
app.on('app:proceed', () => console.log('[creapp] preflight ok -> app:proceed'));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
