const { BrowserWindow } = require('electron');
const path = require('path');
const { IPC } = require('../shared/constants');

class SettingsWindow {
  constructor() {
    this.window = null;
  }

  show() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 580,
      height: 720,
      minWidth: 500,
      minHeight: 600,
      resizable: true,
      show: false,
      title: '🪳 蟑螂提醒设置',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'settingsPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    const settingsPath = path.join(__dirname, '..', 'renderer', 'settings', 'settings.html');
    this.window.loadFile(settingsPath);

    this.window.once('ready-to-show', () => {
      this.window.show();
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  sendSettingsChanged(settings) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(IPC.SETTINGS_CHANGED, settings);
    }
  }

  sendTimerState(state) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('timer-tick', state);
    }
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
  }
}

module.exports = SettingsWindow;
