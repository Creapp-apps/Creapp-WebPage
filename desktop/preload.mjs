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
  retry: (id) => ipcRenderer.send('desktop:retry', id),
  dismiss: (id) => ipcRenderer.send('desktop:dismiss', id),
});
