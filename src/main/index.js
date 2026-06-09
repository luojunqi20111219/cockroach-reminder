const { app, BrowserWindow, ipcMain, protocol, net, Notification, screen } = require('electron');
const path = require('path');
const url = require('url');

const Timer = require('./timer');
const TrayManager = require('./tray');
const OverlayManager = require('./overlayManager');
const SettingsWindow = require('./settingsWindow');
const { getAllSettings, saveSettings, store } = require('./store');
const { IPC, PHASE, getFramesDir, getFrameFilename } = require('../shared/constants');

// --- Single instance lock ---
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// --- Register custom protocol for frame images ---
protocol.registerSchemesAsPrivileged([{
  scheme: 'cockroach',
  privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);

// --- App instances ---
let timer;
let trayManager;
let overlayManager;
let settingsWindow;

// --- App ready ---
app.on('ready', () => {
  // Hide dock icon on macOS (menu bar only app)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  // Register protocol handler for frame images
  const framesDir = getFramesDir();
  protocol.handle('cockroach', (request) => {
    try {
      const urlObj = new URL(request.url);
      // Get the filename from the path, ignoring any host or extra path segments
      const filename = path.basename(urlObj.pathname);
      const filePath = path.join(framesDir, filename);
      return net.fetch(url.pathToFileURL(filePath).toString());
    } catch (error) {
      console.error('Protocol handler error:', error);
      return new Response('Error loading frame', { status: 500 });
    }
  });

  // Initialize modules
  timer = new Timer();
  overlayManager = new OverlayManager();
  settingsWindow = new SettingsWindow();

  // Initialize overlay windows
  overlayManager.init();

  // Initialize tray
  trayManager = new TrayManager(
    timer,
    () => settingsWindow.show(),           // onSettings
    () => timer.triggerBreak(),            // onTriggerBreak
    () => {                                 // onToggleTimer
      if (timer.phase === PHASE.RUNNING) {
        timer.pause();
      } else if (timer.phase === PHASE.PAUSED) {
        timer.resume();
      }
    },
    () => {                                 // onQuit
      app.quit();
    }
  );
  trayManager.init();

  // --- Timer events ---
  timer.on('tick', (state) => {
    trayManager.refresh();
    settingsWindow.sendTimerState(state);
  });

  timer.on('phase-change', ({ phase }) => {
    trayManager.refresh();

    if (phase === PHASE.BREAK) {
      const settings = getAllSettings();
      overlayManager.showCockroaches(settings.cockroachCount, settings.durationSeconds);

      if (settings.showNotifications) {
        const notif = new Notification({
          title: '🪳 休息时间到！',
          body: '该放松一下眼睛了！看，蟑螂们出来了...',
          silent: true,
        });
        notif.show();
      }
    }

    if (phase === PHASE.RUNNING) {
      // Restarted after break
      trayManager.refresh();
    }
  });

  // --- IPC handlers ---
  setupIPC();

  // --- Auto-start timer ---
  if (store.get('autoStart')) {
    timer.start();
  }

  // --- Login item ---
  app.setLoginItemSettings({
    openAtLogin: store.get('launchAtLogin'),
  });
});

function setupIPC() {
  // Settings
  ipcMain.handle(IPC.GET_SETTINGS, () => {
    return getAllSettings();
  });

  ipcMain.handle(IPC.SAVE_SETTINGS, (_, settings) => {
    saveSettings(settings);

    // Update timer with new interval/duration
    if (settings.intervalMinutes !== undefined) {
      timer.updateInterval(settings.intervalMinutes);
    }
    if (settings.durationSeconds !== undefined) {
      timer.updateDuration(settings.durationSeconds);
    }

    // Update login item
    if (settings.launchAtLogin !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: settings.launchAtLogin,
      });
    }

    // Notify all windows
    const allSettings = getAllSettings();
    settingsWindow.sendSettingsChanged(allSettings);

    // Send updated settings to overlay windows
    for (const win of overlayManager.windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.SETTINGS_UPDATED, allSettings);
      }
    }

    trayManager.refresh();
    return { ok: true };
  });

  // Timer state
  ipcMain.handle(IPC.GET_TIMER_STATE, () => {
    return timer.getRemaining();
  });

  // Trigger break
  ipcMain.on(IPC.TRIGGER_BREAK, () => {
    timer.triggerBreak();
  });

  // Set timer running/paused
  ipcMain.on(IPC.SET_TIMER_RUNNING, (_, running) => {
    if (running) {
      if (timer.phase === PHASE.PAUSED) {
        timer.resume();
      } else if (timer.phase === PHASE.IDLE) {
        timer.start();
      }
    } else {
      timer.pause();
    }
  });

  // Animation done from overlay
  ipcMain.on(IPC.ANIMATION_DONE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      overlayManager.onAnimationDone(win);
    }
  });
}

// --- App lifecycle ---
app.on('second-instance', () => {
  // Focus settings window if second instance launched
  settingsWindow.show();
});

app.on('window-all-closed', () => {
  // Don't quit — tray app stays running
});

app.on('before-quit', () => {
  if (timer) timer.stop();
  if (trayManager) trayManager.destroy();
  if (overlayManager) overlayManager.destroy();
  if (settingsWindow) settingsWindow.destroy();
});
