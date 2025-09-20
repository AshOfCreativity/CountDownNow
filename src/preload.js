const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations for persistence
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
  loadFile: (filename) => ipcRenderer.invoke('load-file', filename),
  
  // Desktop notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Audio context for Web Audio API (allow direct access since it's safe)
  createAudioContext: () => {
    return new (window.AudioContext || window.webkitAudioContext)();
  }
});