import { SimulationState } from "./SimulationState.js";

export class SimulationClock {
  constructor({
    state = new SimulationState(),
    simulationDelta = 1 / 240,
    maxFrameDelta = 0.1,
    maxSubSteps = 480,
  } = {}) {
    if (!(simulationDelta > 0)) throw new RangeError("simulationDelta must be greater than zero.");
    if (!(maxFrameDelta > 0)) throw new RangeError("maxFrameDelta must be greater than zero.");
    if (!Number.isInteger(maxSubSteps) || maxSubSteps < 1) throw new RangeError("maxSubSteps must be a positive integer.");

    this.state = state;
    this.simulationDelta = simulationDelta;
    this.maxFrameDelta = maxFrameDelta;
    this.maxSubSteps = maxSubSteps;
    this.renderDelta = 0;
    this.accumulator = 0;
    this.lastTimestamp = null;
  }

  start(timestamp = null) {
    this.state.start();
    this.lastTimestamp = timestamp;
  }

  stop() {
    this.state.stop();
    this.lastTimestamp = null;
    this.renderDelta = 0;
    this.accumulator = 0;
  }

  pause() {
    this.state.pause();
  }

  resume() {
    this.state.resume();
  }

  reset() {
    this.state.resetTime();
    this.renderDelta = 0;
    this.accumulator = 0;
  }

  setTimeScale(timeScale) {
    this.state.setTimeScale(timeScale);
  }

  synchronize(timestamp = null) {
    this.lastTimestamp = timestamp;
    this.renderDelta = 0;
    this.accumulator = 0;
  }

  tick(timestamp, update) {
    if (!this.state.running) return 0;

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
      this.state.frame += 1;
      return 0;
    }

    const elapsed = Math.max(0, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    this.renderDelta = Math.min(elapsed, this.maxFrameDelta);
    this.state.renderTime += this.renderDelta;
    this.state.frame += 1;

    if (this.state.paused) return 0;

    const maximumAccumulation = this.simulationDelta * this.maxSubSteps;
    this.accumulator = Math.min(
      this.accumulator + this.renderDelta * this.state.timeScale,
      maximumAccumulation,
    );

    let steps = 0;
    while (this.accumulator >= this.simulationDelta && steps < this.maxSubSteps) {
      update(this.simulationDelta, this.state);
      this.accumulator -= this.simulationDelta;
      this.state.simulationTime += this.simulationDelta;
      steps += 1;
    }

    return steps;
  }
}
