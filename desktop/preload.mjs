import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('creapp', {
  runPreflight: () => ipcRenderer.invoke('preflight:run'),
  proceed: () => ipcRenderer.send('app:proceed'),
});
