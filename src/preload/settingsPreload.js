const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings-changed', (_, settings) => callback(settings));
  },
  triggerBreak: () => ipcRenderer.send('trigger-break'),
  getTimerState: () => ipcRenderer.invoke('get-timer-state'),
  setTimerRunning: (running) => ipcRenderer.send('set-timer-running', running),
  onTimerTick: (callback) => {
    ipcRenderer.on('timer-tick', (_, state) => callback(state));
  },
});
