import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('creapp', {
  runPreflight: () => ipcRenderer.invoke('preflight:run'),
  proceed: () => ipcRenderer.send('app:proceed'),
});

// Bridge de toast + conectividad (overlay autocontenido del desktop).
const subscribe = (channel) => (cb) => {
  const h = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};
contextBridge.exposeInMainWorld('creappDesktop', {
  onToast: subscribe('desktop:toast'),
  onConnectivity: subscribe('desktop:connectivity'),
  onMotorStatus: subscribe('desktop:motor-status'),
  retry: (id) => ipcRenderer.send('desktop:retry', id),
  gitPush: () => ipcRenderer.invoke('desktop:git-push'),
  gitPull: () => ipcRenderer.invoke('desktop:git-pull'),
  observeUpload: (jobId) => ipcRenderer.invoke('desktop:observe-upload', jobId),
  dismiss: (id) => ipcRenderer.send('desktop:dismiss', id),
  openMotorTerminal: (command) => ipcRenderer.invoke('desktop:open-motor-terminal', command),
  // Puente campanita → notificación nativa del SO + badge del dock.
  notify: (payload) => ipcRenderer.send('desktop:notify', payload),
  setBadge: (n) => ipcRenderer.send('desktop:badge', n),
  // Confirmación de salida: el main pide el modal (onConfirmQuit) y el renderer responde.
  onConfirmQuit: subscribe('desktop:confirm-quit'),
  confirmQuit: () => ipcRenderer.send('desktop:quit-confirmed'),
  cancelQuit: () => ipcRenderer.send('desktop:quit-cancelled'),
});

// Terminal embebido: el renderer (xterm) habla con el PTY del main.
contextBridge.exposeInMainWorld('creappTerm', {
  start: (size) => ipcRenderer.invoke('term:start', size),
  onData: subscribe('term:data'),
  onExit: subscribe('term:exit'),
  write: (data) => ipcRenderer.send('term:write', data),
  resize: (cols, rows) => ipcRenderer.send('term:resize', { cols, rows }),
  dispose: () => ipcRenderer.send('term:dispose'),
  // Arrastrar y soltar un directorio/archivo del Finder sobre la terminal.
  // La ruta real SOLO se puede resolver acá: el preload comparte el DOM pero vive
  // en su propio world, así que ve el File nativo (no el clon que cruza contextBridge,
  // sobre el que webUtils.getPathForFile tira excepción). El listener corre en captura
  // a nivel window para ganarle a los handlers del textarea/canvas de xterm; sólo
  // actúa si el drop cae dentro del contenedor marcado con [data-creapp-terminal].
  // Al renderer sólo cruzan strings (las rutas), que sí sobreviven el bridge.
  onDropPaths: (cb) => {
    dropSubscribers.add(cb);
    return () => dropSubscribers.delete(cb);
  },
});

const dropSubscribers = new Set();
const insideTerminal = (target) =>
  target && typeof target.closest === 'function' && target.closest('[data-creapp-terminal]');

window.addEventListener('dragover', (e) => {
  if (!insideTerminal(e.target)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}, true);

window.addEventListener('drop', (e) => {
  if (!insideTerminal(e.target)) return;
  e.preventDefault();
  const files = e.dataTransfer && e.dataTransfer.files;
  if (!files || files.length === 0) return;
  const paths = [];
  for (const f of Array.from(files)) {
    try {
      const p = webUtils.getPathForFile(f);
      if (p) paths.push(p);
    } catch { /* File sin ruta (ej. arrastrado del navegador); se ignora */ }
  }
  if (paths.length === 0) return;
  for (const cb of dropSubscribers) {
    try { cb(paths); } catch { /* ignore */ }
  }
}, true);
