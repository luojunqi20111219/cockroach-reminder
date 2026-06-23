const { EventEmitter } = require('events');
const { PHASE } = require('../shared/constants');
const { store } = require('./store');

class Timer extends EventEmitter {
  constructor() {
    super();
    this.phase = PHASE.IDLE;
    this.remainingMs = 0;
    this.intervalId = null;
    this.endTime = 0;
    this.intervalMinutes = store.get('intervalMinutes');
    this.durationSeconds = store.get('durationSeconds');
  }

  start() {
    this.stop();
    this.remainingMs = this.intervalMinutes * 60 * 1000;
    this.endTime = Date.now() + this.remainingMs;
    this.phase = PHASE.RUNNING;
    this.emit('phase-change', { phase: this.phase });
    this._startTicking();
  }

  pause() {
    if (this.phase !== PHASE.RUNNING) return;
    this._stopTicking();
    this.phase = PHASE.PAUSED;
    this.emit('phase-change', { phase: this.phase });
  }

  resume() {
    if (this.phase !== PHASE.PAUSED) return;
    this.phase = PHASE.RUNNING;
    this.endTime = Date.now() + this.remainingMs;
    this.emit('phase-change', { phase: this.phase });
    this._startTicking();
  }

  triggerBreak() {
    this._stopTicking();
    this.phase = PHASE.BREAK;
    this.remainingMs = this.durationSeconds * 1000;
    this.endTime = Date.now() + this.remainingMs;
    this.emit('phase-change', { phase: this.phase });

    this._startTicking(() => {
      // Break ended, restart work timer
      this.start();
    });
  }

  stop() {
    this._stopTicking();
    this.phase = PHASE.IDLE;
    this.remainingMs = 0;
    this.emit('phase-change', { phase: this.phase });
  }

  getRemaining() {
    const total = Math.max(0, this.remainingMs);
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    return { minutes, seconds, totalMs: total, phase: this.phase };
  }

  getFormattedRemaining() {
    const { minutes, seconds } = this.getRemaining();
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  updateInterval(minutes) {
    this.intervalMinutes = minutes;
    // If currently running (not in break), reset timer with new interval
    if (this.phase === PHASE.RUNNING) {
      this.start();
    }
  }

  updateDuration(seconds) {
    this.durationSeconds = seconds;
  }

  _startTicking(onBreakEnd) {
    this._stopTicking();
    this.intervalId = setInterval(() => {
      this.remainingMs = this.endTime - Date.now();

      this.emit('tick', this.getRemaining());

      if (this.remainingMs <= 0) {
        this._stopTicking();
        if (this.phase === PHASE.RUNNING) {
          // Work time ended, start break
          this.triggerBreak();
        } else if (this.phase === PHASE.BREAK) {
          // Break ended
          if (onBreakEnd) onBreakEnd();
        }
      }
    }, 1000);
  }

  _stopTicking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

module.exports = Timer;
