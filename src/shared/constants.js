// Shared constants for the Cockroach Reminder app
const path = require('path');

// Frame animation constants
const TOTAL_FRAMES = 13;
const FRAME_PREFIX = '001_1.1.';
const FRAME_EXT = '.png';

// Default settings
const DEFAULTS = {
  intervalMinutes: 25,
  durationSeconds: 15,
  cockroachCount: 10,
  cockroachSizePercent: 35,
  normalSpeedFps: 10,
  fastSpeedMinFps: 10,
  fastSpeedMaxFps: 60,
  fastSpeedProbability: 0.65,
  movementPercent: 13.5,
  autoStart: true,
  launchAtLogin: false,
  showNotifications: true,
  soundEnabled: false,
};

// IPC channel names
const IPC = {
  SHOW_COCKROACHES: 'show-cockroaches',
  HIDE_COCKROACHES: 'hide-cockroaches',
  ANIMATION_DONE: 'animation-done',
  SETTINGS_UPDATED: 'settings-updated',
  SETTINGS_CHANGED: 'settings-changed',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  TRIGGER_BREAK: 'trigger-break',
  GET_TIMER_STATE: 'get-timer-state',
  SET_TIMER_RUNNING: 'set-timer-running',
  GET_FRAME_URL: 'get-frame-url',
};

// Timer phases
const PHASE = {
  IDLE: 'idle',
  RUNNING: 'running',
  BREAK: 'break',
  PAUSED: 'paused',
};

// Resolve frames directory
function getAssetsDir() {
  const { app } = require('electron');
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets');
  }
  return path.join(__dirname, '..', '..', 'assets');
}

function getFramesDir() {
  return path.join(getAssetsDir(), 'frames');
}

function getFrameFilename(index) {
  return `${FRAME_PREFIX}${index}${FRAME_EXT}`;
}

module.exports = {
  TOTAL_FRAMES,
  FRAME_PREFIX,
  FRAME_EXT,
  DEFAULTS,
  IPC,
  PHASE,
  getAssetsDir,
  getFramesDir,
  getFrameFilename,
};
