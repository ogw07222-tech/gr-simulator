export const FRAME_RATE_OPTIONS = Object.freeze([30, 45, 60, 90, 120, 0]);
export const DEFAULT_MAX_FPS = 60;
export const FRAME_RATE_STORAGE_KEY = "gr4d.maxFps";

function readStoredFrameRate(storage) {
  if (!storage) return DEFAULT_MAX_FPS;
  const stored = storage.getItem(FRAME_RATE_STORAGE_KEY);
  if (stored === null) return DEFAULT_MAX_FPS;
  const value = Number(stored);
  return FRAME_RATE_OPTIONS.includes(value) ? value : DEFAULT_MAX_FPS;
}

export class FrameRateController {
  constructor({ storage = typeof window === "undefined" ? null : window.localStorage } = {}) {
    this.storage = storage;
    this.maxFps = readStoredFrameRate(storage);
    this.lastTimestamp = null;
    this.lastRenderTimestamp = null;
    this.accumulator = 0;
    this.renderDelta = 0;
  }

  setMaxFps(maxFps) {
    const value = Number(maxFps);
    if (!FRAME_RATE_OPTIONS.includes(value)) throw new RangeError("Unsupported maximum FPS.");
    this.maxFps = value;
    this.reset();
    this.storage?.setItem(FRAME_RATE_STORAGE_KEY, String(value));
  }

  reset(timestamp = null) {
    this.lastTimestamp = timestamp;
    this.lastRenderTimestamp = timestamp;
    this.accumulator = 0;
    this.renderDelta = 0;
  }

  shouldRender(timestamp, hidden = false) {
    if (!Number.isFinite(timestamp)) throw new TypeError("Frame timestamp must be finite.");
    if (hidden) {
      this.reset(timestamp);
      return false;
    }
    if (this.lastTimestamp === null) {
      this.reset(timestamp);
      return true;
    }

    const elapsed = Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    if (this.maxFps !== 0) {
      const interval = 1000 / this.maxFps;
      this.accumulator += elapsed;
      if (this.accumulator + 0.001 < interval) return false;
      this.accumulator = Math.max(0, this.accumulator - interval);
      if (this.accumulator >= interval) this.accumulator %= interval;
    }

    this.renderDelta = Math.min(
      Math.max(0, timestamp - (this.lastRenderTimestamp ?? timestamp)) / 1000,
      0.25,
    );
    this.lastRenderTimestamp = timestamp;
    return true;
  }
}
