export const TIME_SCALES = Object.freeze([0.25, 0.5, 1, 2, 5, 10, 50, 100]);

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
    if (!TIME_SCALES.includes(timeScale)) {
      throw new RangeError(`Unsupported simulation time scale: ${timeScale}`);
    }
    this.timeScale = timeScale;
  }

  resetTime() {
    this.frame = 0;
    this.simulationTime = 0;
    this.renderTime = 0;
  }
}
