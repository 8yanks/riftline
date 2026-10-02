const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('riftlineDesktop', {
  preview: (enabled) => ipcRenderer.invoke('riftline-preview', enabled),
  onOverlayState: (callback) => ipcRenderer.on('riftline-overlay-state', (_event, state) => callback(state))
});
