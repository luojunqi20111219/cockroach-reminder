const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { PHASE, getAssetsDir } = require('../shared/constants');

class TrayManager {
  constructor(timer, onSettings, onTriggerBreak, onToggleTimer, onQuit) {
    this.timer = timer;
    this.tray = null;
    this.onSettings = onSettings;
    this.onTriggerBreak = onTriggerBreak;
    this.onToggleTimer = onToggleTimer;
    this.onQuit = onQuit;
  }

  init() {
    const iconName = process.platform === 'win32' ? 'trayIcon.ico' : 'trayIconTemplate.png';
    const iconPath = path.join(getAssetsDir(), iconName);

    // Create a simple tray icon (fallback: text-based)
    let icon;
    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) throw new Error('empty');
    } catch {
      // Create a simple 16x16 icon as fallback
      icon = nativeImage.createFromBuffer(this._createFallbackIcon());
    }

    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('🪳 蟑螂提醒');
    this._rebuildMenu();
  }

  _createFallbackIcon() {
    // Simple 16x16 PNG with a cockroach emoji placeholder (minimal valid PNG)
    // In production, replace with actual icon file
    const { nativeImage: ni } = require('electron');
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    // Fill with a dark brown color
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = 139;     // R
      canvas[i * 4 + 1] = 69;  // G
      canvas[i * 4 + 2] = 19;  // B
      canvas[i * 4 + 3] = 255; // A
    }
    return ni.createFromBuffer(canvas, { width: size, height: size }).toPNG();
  }

  updateTooltip() {
    if (!this.tray) return;
    const state = this.timer.getRemaining();
    let text;
    switch (state.phase) {
      case PHASE.RUNNING:
        text = `🪳 下次休息还有 ${this.timer.getFormattedRemaining()}`;
        break;
      case PHASE.BREAK:
        text = `🪳 休息时间！还剩 ${this.timer.getFormattedRemaining()}`;
        break;
      case PHASE.PAUSED:
        text = `🪳 已暂停 — 剩余 ${this.timer.getFormattedRemaining()}`;
        break;
      default:
        text = '🪳 蟑螂提醒 (已停止)';
    }
    this.tray.setToolTip(text);
  }

  _rebuildMenu() {
    if (!this.tray) return;

    const state = this.timer.getRemaining();
    const isRunning = state.phase === PHASE.RUNNING;
    const isPaused = state.phase === PHASE.PAUSED;
    const isBreak = state.phase === PHASE.BREAK;

    const statusLabel = isRunning
      ? `⏱ 下次休息还有 ${this.timer.getFormattedRemaining()}`
      : isBreak
        ? `🪳 休息中！还剩 ${this.timer.getFormattedRemaining()}`
        : isPaused
          ? `⏸ 已暂停 — 剩余 ${this.timer.getFormattedRemaining()}`
          : '⏹ 计时器已停止';

    const toggleLabel = isRunning ? '⏸  暂停计时' : '▶  恢复计时';
    const toggleEnabled = isRunning || isPaused;

    const contextMenu = Menu.buildFromTemplate([
      { label: statusLabel, enabled: false },
      { type: 'separator' },
      {
        label: toggleLabel,
        enabled: toggleEnabled,
        click: () => this.onToggleTimer(),
      },
      {
        label: '🪳  立即开始休息 (召唤蟑螂)',
        click: () => this.onTriggerBreak(),
      },
      { type: 'separator' },
      {
        label: '⚙  设置…',
        click: () => this.onSettings(),
      },
      { type: 'separator' },
      {
        label: '❌  退出',
        click: () => this.onQuit(),
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  refresh() {
    this.updateTooltip();
    this._rebuildMenu();
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = TrayManager;
