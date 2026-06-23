// Cockroach Overlay Animation
// Ported from index.html reference implementation

const canvas = document.getElementById('canvas');
const TOTAL_FRAMES = 13;

// Preload all frame images
const frameImages = [];
let framesLoaded = 0;
let allFramesReady = false;

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const img = new Image();
  img.onload = () => {
    framesLoaded++;
    console.log(`Frame ${i} loaded (${framesLoaded}/${TOTAL_FRAMES})`);
    if (framesLoaded === TOTAL_FRAMES) {
      allFramesReady = true;
      console.log('All cockroach frames ready');
    }
  };
  img.onerror = (e) => {
    console.error(`Failed to load frame ${i}:`, img.src, e);
  };
  img.src = window.cockroachAPI.getFrameUrl(i);
  frameImages.push(img);
}

// --- Cockroach Class ---
class Cockroach {
  constructor(config) {
    this.el = document.createElement('img');
    this.el.alt = 'cockroach';
    canvas.appendChild(this.el);

    this.config = config || {};
    this.frameIndex = 0;
    this.startX = 0;
    this.startY = 0;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.lastUpdateTime = 0;
    this.cachedWidth = 0;

    // Speed: 35% normal, 65% fast
    const isFast = Math.random() < (this.config.fastSpeedProbability || 0.65);
    const baseFps = this.config.normalSpeedFps || 10;
    const minFastFps = this.config.fastSpeedMinFps || 10;
    const maxFastFps = this.config.fastSpeedMaxFps || 60;

    let individualFps;
    if (isFast) {
      individualFps = minFastFps + Math.random() * (maxFastFps - minFastFps);
    } else {
      individualFps = baseFps;
    }
    this.interval = 1000 / individualFps;

    // Spawn delay (0-3 seconds stagger)
    this.spawnDelay = Math.random() * 3000;
    this.spawnTime = 0;
    this.spawned = false;

    this.initRandomPosition();
  }

  initRandomPosition() {
    const side = Math.floor(Math.random() * 4);
    const padding = 100;
    const W = window.innerWidth;
    const H = window.innerHeight;

    let x, y, targetAngle;

    if (side === 0) { // Top
      x = Math.random() * W;
      y = -padding;
      targetAngle = 90 + (Math.random() * 90 - 45);
    } else if (side === 1) { // Right
      x = W + padding;
      y = Math.random() * H;
      targetAngle = 180 + (Math.random() * 90 - 45);
    } else if (side === 2) { // Bottom
      x = Math.random() * W;
      y = H + padding;
      targetAngle = 270 + (Math.random() * 90 - 45);
    } else { // Left
      x = -padding;
      y = Math.random() * H;
      targetAngle = 0 + (Math.random() * 90 - 45);
    }

    this.startX = x;
    this.startY = y;
    this.angle = targetAngle;

    const rad = (targetAngle * Math.PI) / 180;
    this.vx = Math.cos(rad);
    this.vy = Math.sin(rad);

    // Set size based on config
    const sizePercent = this.config.cockroachSizePercent || 35;
    this.el.style.width = `${sizePercent}vw`;
    this.cachedWidth = window.innerWidth * (sizePercent / 100);

    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  startSpawning(startTime) {
    this.spawnTime = startTime + this.spawnDelay;
  }

  update(currentTime) {
    if (!this.spawned) {
      if (currentTime >= this.spawnTime) {
        this.spawned = true;
        this.lastUpdateTime = currentTime;
        this.el.style.opacity = '1';
        // Show first frame immediately
        this._advanceFrame();
      }
      return;
    }

    if (!this.lastUpdateTime) this.lastUpdateTime = currentTime;

    const elapsed = currentTime - this.lastUpdateTime;
    if (elapsed >= this.interval) {
      this._advanceFrame();
      this.lastUpdateTime = currentTime - (elapsed % this.interval);
    }
  }

  _advanceFrame() {
    const frameNum = this.frameIndex % TOTAL_FRAMES;
    const cycle = Math.floor(this.frameIndex / TOTAL_FRAMES);
    const movementPercent = (this.config.movementPercent || 13.5) / 100;
    const offset = cycle * (this.cachedWidth * movementPercent);

    this.el.src = frameImages[frameNum].src;

    const curX = offset * this.vx;
    const curY = offset * this.vy;

    const realX = this.startX + curX;
    const realY = this.startY + curY;

    this.el.style.transform = `translate(-50%, -50%) translate(${curX}px, ${curY}px) rotate(${this.angle}deg)`;

    this.frameIndex++;

    // Boundary check
    const margin = this.cachedWidth;
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (
      realX < -margin ||
      realX > W + margin ||
      realY < -margin ||
      realY > H + margin
    ) {
      this.reset();
    }
  }

  reset() {
    this.frameIndex = 0;
    this.initRandomPosition();
  }

  hide() {
    this.el.style.opacity = '0';
  }

  destroy() {
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}

// --- Animation Controller ---
let cockroaches = [];
let animationId = null;
let hideTimeout = null;
let cleanupTimeout = null;

function startAnimation(config) {
  if (!allFramesReady) {
    // Retry after frames load
    setTimeout(() => startAnimation(config), 200);
    return;
  }

  // Clear any existing animation and pending cleanup
  stopAnimation(true);

  const count = config.count || 3;
  const duration = (config.duration || 15) * 1000;
  const settings = config.settings || {};

  const animConfig = {
    cockroachSizePercent: settings.cockroachSizePercent || 35,
    normalSpeedFps: settings.normalSpeedFps || 10,
    fastSpeedMinFps: settings.fastSpeedMinFps || 10,
    fastSpeedMaxFps: settings.fastSpeedMaxFps || 60,
    fastSpeedProbability: settings.fastSpeedProbability || 0.65,
    movementPercent: settings.movementPercent || 13.5,
  };

  const startTime = performance.now();

  for (let i = 0; i < count; i++) {
    const c = new Cockroach(animConfig);
    c.startSpawning(startTime);
    cockroaches.push(c);
  }

  function animate(currentTime) {
    cockroaches.forEach(c => c.update(currentTime));
    animationId = requestAnimationFrame(animate);
  }
  animationId = requestAnimationFrame(animate);

  // Auto-stop after duration
  hideTimeout = setTimeout(() => {
    stopAnimation();
  }, duration);
}

function stopAnimation(immediate = false) {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  if (cleanupTimeout) {
    clearTimeout(cleanupTimeout);
    cleanupTimeout = null;
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (immediate) {
    cockroaches.forEach(c => c.destroy());
    cockroaches = [];
  } else {
    // Fade out
    cockroaches.forEach(c => c.hide());

    // Clean up after fade
    cleanupTimeout = setTimeout(() => {
      cockroaches.forEach(c => c.destroy());
      cockroaches = [];
      cleanupTimeout = null;
      window.cockroachAPI.animationDone();
    }, 400);
  }
}

// Listen for IPC commands
window.cockroachAPI.onShow((config) => {
  console.log('Received show-cockroaches command', config);
  startAnimation(config);
});

window.cockroachAPI.onHide(() => {
  stopAnimation();
});
