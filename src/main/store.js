const Store = require('electron-store');
const { DEFAULTS } = require('../shared/constants');

const schema = {
  intervalMinutes: { type: 'number', default: DEFAULTS.intervalMinutes, minimum: 1, maximum: 120 },
  durationSeconds: { type: 'number', default: DEFAULTS.durationSeconds, minimum: 3, maximum: 120 },
  cockroachCount: { type: 'number', default: DEFAULTS.cockroachCount, minimum: 1, maximum: 50 },
  cockroachSizePercent: { type: 'number', default: DEFAULTS.cockroachSizePercent, minimum: 10, maximum: 80 },
  normalSpeedFps: { type: 'number', default: DEFAULTS.normalSpeedFps, minimum: 5, maximum: 30 },
  fastSpeedMinFps: { type: 'number', default: DEFAULTS.fastSpeedMinFps, minimum: 5, maximum: 30 },
  fastSpeedMaxFps: { type: 'number', default: DEFAULTS.fastSpeedMaxFps, minimum: 15, maximum: 60 },
  fastSpeedProbability: { type: 'number', default: DEFAULTS.fastSpeedProbability, minimum: 0, maximum: 1 },
  movementPercent: { type: 'number', default: DEFAULTS.movementPercent, minimum: 5, maximum: 50 },
  autoStart: { type: 'boolean', default: DEFAULTS.autoStart },
  launchAtLogin: { type: 'boolean', default: DEFAULTS.launchAtLogin },
  showNotifications: { type: 'boolean', default: DEFAULTS.showNotifications },
  soundEnabled: { type: 'boolean', default: DEFAULTS.soundEnabled },
};

const store = new Store({ schema });

function getAllSettings() {
  const settings = {};
  for (const key of Object.keys(schema)) {
    settings[key] = store.get(key);
  }
  return settings;
}

function saveSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    if (schema[key] !== undefined) {
      store.set(key, value);
    }
  }
}

module.exports = { store, getAllSettings, saveSettings, schema };
