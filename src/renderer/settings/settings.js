// Settings UI logic
const api = window.settingsAPI;

// DOM elements
const intervalSlider = document.getElementById('interval');
const durationSlider = document.getElementById('duration');
const countSlider = document.getElementById('count');
const sizeSlider = document.getElementById('size');
const speedSlider = document.getElementById('speed');
const fastProbSlider = document.getElementById('fastProb');
const autoStartCheck = document.getElementById('autoStart');
const launchAtLoginCheck = document.getElementById('launchAtLogin');
const showNotificationsCheck = document.getElementById('showNotifications');

const intervalVal = document.getElementById('interval-val');
const durationVal = document.getElementById('duration-val');
const countVal = document.getElementById('count-val');
const sizeVal = document.getElementById('size-val');
const speedVal = document.getElementById('speed-val');
const fastProbVal = document.getElementById('fastProb-val');

const btnTest = document.getElementById('btn-test');
const btnPause = document.getElementById('btn-pause');
const btnSave = document.getElementById('btn-save');
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('status-text');

// Load settings
async function loadSettings() {
  const s = await api.getSettings();
  intervalSlider.value = s.intervalMinutes;
  durationSlider.value = s.durationSeconds;
  countSlider.value = s.cockroachCount;
  sizeSlider.value = s.cockroachSizePercent;
  speedSlider.value = s.movementPercent;
  fastProbSlider.value = Math.round(s.fastSpeedProbability * 100);
  autoStartCheck.checked = s.autoStart;
  launchAtLoginCheck.checked = s.launchAtLogin;
  showNotificationsCheck.checked = s.showNotifications;
  updateDisplays();
}

// Update value displays
function updateDisplays() {
  intervalVal.textContent = `${intervalSlider.value} 分钟`;
  durationVal.textContent = `${durationSlider.value} 秒`;
  countVal.textContent = countSlider.value;
  sizeVal.textContent = `${sizeSlider.value}%`;
  speedVal.textContent = `${parseFloat(speedSlider.value).toFixed(1)}%`;
  fastProbVal.textContent = `${fastProbSlider.value}%`;
}

// Slider input listeners
[intervalSlider, durationSlider, countSlider, sizeSlider, speedSlider, fastProbSlider].forEach(slider => {
  slider.addEventListener('input', updateDisplays);
});

// Save settings
btnSave.addEventListener('click', async () => {
  const settings = {
    intervalMinutes: parseInt(intervalSlider.value),
    durationSeconds: parseInt(durationSlider.value),
    cockroachCount: parseInt(countSlider.value),
    cockroachSizePercent: parseInt(sizeSlider.value),
    movementPercent: parseFloat(speedSlider.value),
    fastSpeedProbability: parseInt(fastProbSlider.value) / 100,
    autoStart: autoStartCheck.checked,
    launchAtLogin: launchAtLoginCheck.checked,
    showNotifications: showNotificationsCheck.checked,
  };

  await api.saveSettings(settings);
  showToast('✅ 设置已保存！');
});

// Test break
btnTest.addEventListener('click', () => {
  api.triggerBreak();
});

// Pause/Resume timer
let isPaused = false;
btnPause.addEventListener('click', () => {
  isPaused = !isPaused;
  api.setTimerRunning(!isPaused);
  btnPause.textContent = isPaused ? '▶ 恢复计时' : '⏸ 暂停计时';
});

// Timer tick updates
api.onTimerTick((state) => {
  updateStatus(state);
});

function updateStatus(state) {
  const { phase, minutes, seconds } = state;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  statusDot.className = 'status-dot';

  switch (phase) {
    case 'running':
      statusDot.classList.add('running');
      statusText.textContent = `计时中 — 下次休息还有 ${timeStr}`;
      btnPause.textContent = '⏸ 暂停计时';
      isPaused = false;
      break;
    case 'break':
      statusDot.classList.add('break');
      statusText.textContent = `休息时间！还剩 ${timeStr}`;
      break;
    case 'paused':
      statusDot.classList.add('paused');
      statusText.textContent = `已暂停 — 剩余 ${timeStr}`;
      btnPause.textContent = '▶ 恢复计时';
      isPaused = true;
      break;
    default:
      statusText.textContent = '计时器已停止';
  }
}

// Settings changed from another source
api.onSettingsChanged((settings) => {
  intervalSlider.value = settings.intervalMinutes;
  durationSlider.value = settings.durationSeconds;
  countSlider.value = settings.cockroachCount;
  sizeSlider.value = settings.cockroachSizePercent;
  speedSlider.value = settings.movementPercent;
  fastProbSlider.value = Math.round(settings.fastSpeedProbability * 100);
  autoStartCheck.checked = settings.autoStart;
  launchAtLoginCheck.checked = settings.launchAtLogin;
  showNotificationsCheck.checked = settings.showNotifications;
  updateDisplays();
});

// Toast notification
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Init
loadSettings().then(() => {
  // Also get initial timer state
  api.getTimerState().then(updateStatus);
});
