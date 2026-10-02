const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('riftlineDesktop', {
  preview: (enabled) => ipcRenderer.invoke('riftline-preview', enabled),
  openDraft: () => ipcRenderer.invoke('riftline-open-draft'),
  confirmDraft: () => ipcRenderer.invoke('riftline-confirm-draft'),
  previewItem: () => ipcRenderer.invoke('riftline-preview-item'),
  previewSS: () => ipcRenderer.invoke('riftline-preview-ss'),
  onOverlayState: (callback) => ipcRenderer.on('riftline-overlay-state', (_event, state) => callback(state)),
  onVisionState: (callback) => ipcRenderer.on('riftline-vision-state', (_event, state) => callback(state))
});
