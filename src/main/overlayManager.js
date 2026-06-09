const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { IPC } = require('../shared/constants');
const { getAllSettings } = require('./store');

class OverlayManager {
  constructor() {
    this.windows = [];
    this._displayChangeTimer = null;
    this._onDisplayChange = this._onDisplayChange.bind(this);
  }

  init() {
    this._createOverlays();

    screen.on('display-added', this._onDisplayChange);
    screen.on('display-removed', this._onDisplayChange);
    screen.on('display-metrics-changed', this._onDisplayChange);
  }

  _onDisplayChange() {
    // Debounce display changes
    clearTimeout(this._displayChangeTimer);
    this._displayChangeTimer = setTimeout(() => {
      this._destroyAll();
      this._createOverlays();
    }, 500);
  }

  _createOverlays() {
    const displays = screen.getAllDisplays();
    for (const display of displays) {
      this._createOverlay(display);
    }
  }

  _createOverlay(display) {
    const { x, y, width, height } = display.bounds;

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      transparent: true,
      frame: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'overlayPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Click-through
    win.setIgnoreMouseEvents(true, { forward: true });

    // macOS: visible on all workspaces including fullscreen
    if (process.platform === 'darwin') {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    win.setAlwaysOnTop('screen-saver');

    const overlayPath = path.join(__dirname, '..', 'renderer', 'overlay', 'overlay.html');
    win.loadFile(overlayPath);

    win.on('ready-to-show', () => {
      // Don't show yet — only show during break
    });

    this.windows.push(win);
  }

  showCockroaches(count, duration) {
    const settings = getAllSettings();
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.show();
        win.webContents.send(IPC.SHOW_COCKROACHES, {
          count,
          duration,
          settings,
        });
      }
    }
  }

  hideCockroaches() {
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.HIDE_COCKROACHES);
      }
    }
  }

  onAnimationDone(win) {
    if (!win.isDestroyed()) {
      win.hide();
    }
  }

  _destroyAll() {
    for (const win of this.windows) {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    }
    this.windows = [];
  }

  destroy() {
    screen.removeListener('display-added', this._onDisplayChange);
    screen.removeListener('display-removed', this._onDisplayChange);
    screen.removeListener('display-metrics-changed', this._onDisplayChange);
    clearTimeout(this._displayChangeTimer);
    this._destroyAll();
  }
}

module.exports = OverlayManager;
