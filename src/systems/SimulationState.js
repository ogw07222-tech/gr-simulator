export const TIME_SCALES = Object.freeze([0.25, 0.5, 1, 2, 5, 10, 50, 100, 1000, 10000, 100000]);
export const MIN_TIME_SCALE = 0.01;
export const MAX_TIME_SCALE = 100000;

export class SimulationState {
  constructor({ timeScale = 1 } = {}) {
    this.running = false;
    this.paused = false;
    this.timeScale = 1;
    this.frame = 0;
    this.simulationTime = 0;
    this.renderTime = 0;
    this.setTimeScale(timeScale);
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setTimeScale(timeScale) {
    if (!Number.isFinite(timeScale) || timeScale < MIN_TIME_SCALE || timeScale > MAX_TIME_SCALE) {
      throw new RangeError(`Simulation time scale must be between ${MIN_TIME_SCALE} and ${MAX_TIME_SCALE}: ${timeScale}`);
    }
    this.timeScale = timeScale;
  }

  resetTime() {
    this.frame = 0;
    this.simulationTime = 0;
    this.renderTime = 0;
  }
}
