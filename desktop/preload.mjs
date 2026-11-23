import { contextBridge, ipcRenderer } from 'electron';

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
});
