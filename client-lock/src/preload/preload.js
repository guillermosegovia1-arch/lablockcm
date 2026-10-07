const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lablockApi', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getCurrentSession: () => ipcRenderer.invoke('get-current-session'),
  saveServerUrl: (url) => ipcRenderer.send('save-server-url', url),
  notifySessionUnlocked: (sessionData) => ipcRenderer.send('session-unlocked', sessionData),
  notifySessionLocked: (reason) => ipcRenderer.send('session-locked', reason),
  emergencyExitApp: () => ipcRenderer.send('emergency-exit-app'),
  triggerEndSession: () => ipcRenderer.send('trigger-end-session'),
  minimizeWidget: () => ipcRenderer.send('minimize-widget'),
  shutdownMachine: () => ipcRenderer.send('system-shutdown'),
  restartMachine: () => ipcRenderer.send('system-restart'),
  sleepMachine: () => ipcRenderer.send('system-sleep'),

  // Event Listeners from Main
  onForceLock: (callback) => {
    ipcRenderer.on('force-lock', (_event, data) => callback(data));
  },
  onRequestEndSession: (callback) => {
    ipcRenderer.on('request-end-session', () => callback());
  },
  onTriggerEmergencyModal: (callback) => {
    ipcRenderer.on('trigger-emergency-modal', () => callback());
  },
  onSessionReset: (callback) => {
    ipcRenderer.on('session-reset', () => callback());
  },
});
