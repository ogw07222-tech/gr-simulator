import { SimulationState } from "./SimulationState.js";

export class SimulationClock {
  constructor({
    state = new SimulationState(),
    simulationDelta = 1 / 240,
    maxFrameDelta = 0.1,
    maxSubSteps = 480,
    highSpeedThreshold = 100,
    maxHighSpeedUpdates = 512,
    maxHighSpeedDelta = 1,
  } = {}) {
    if (!(simulationDelta > 0)) throw new RangeError("simulationDelta must be greater than zero.");
    if (!(maxFrameDelta > 0)) throw new RangeError("maxFrameDelta must be greater than zero.");
    if (!Number.isInteger(maxSubSteps) || maxSubSteps < 1) throw new RangeError("maxSubSteps must be a positive integer.");
    if (!(highSpeedThreshold > 0)) throw new RangeError("highSpeedThreshold must be greater than zero.");
    if (!Number.isInteger(maxHighSpeedUpdates) || maxHighSpeedUpdates < 1) throw new RangeError("maxHighSpeedUpdates must be a positive integer.");
    if (!(maxHighSpeedDelta > 0)) throw new RangeError("maxHighSpeedDelta must be greater than zero.");

    this.state = state;
    this.simulationDelta = simulationDelta;
    this.maxFrameDelta = maxFrameDelta;
    this.maxSubSteps = maxSubSteps;
    this.highSpeedThreshold = highSpeedThreshold;
    this.maxHighSpeedUpdates = maxHighSpeedUpdates;
    this.maxHighSpeedDelta = maxHighSpeedDelta;
    this.highSpeedDelta = maxHighSpeedDelta;
    this.renderDelta = 0;
    this.accumulator = 0;
    this.lastAdvancedDelta = 0;
    this.lastUpdateCount = 0;
    this.droppedSimulationTime = 0;
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

  setHighSpeedDelta(delta) {
    if (!(delta > 0) || !Number.isFinite(delta)) throw new RangeError("High-speed delta must be positive and finite.");
    this.highSpeedDelta = Math.min(delta, this.maxHighSpeedDelta);
  }

  effectiveTimeScale() {
    return this.renderDelta > 0 ? this.lastAdvancedDelta / this.renderDelta : 0;
  }

  synchronize(timestamp = null) {
    this.lastTimestamp = timestamp;
    this.renderDelta = 0;
    this.accumulator = 0;
    this.lastAdvancedDelta = 0;
    this.lastUpdateCount = 0;
    this.lastAdvancedDelta = 0;
    this.lastUpdateCount = 0;
    this.droppedSimulationTime = 0;
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

    this.lastAdvancedDelta = 0;
    this.lastUpdateCount = 0;
    if (this.state.paused) return 0;
    const requestedDelta = this.renderDelta * this.state.timeScale;
    if (this.state.timeScale > this.highSpeedThreshold) {
      this.accumulator += requestedDelta;
      while (this.accumulator >= this.simulationDelta && this.lastUpdateCount < this.maxHighSpeedUpdates) {
        const delta = Math.min(this.accumulator, this.highSpeedDelta);
        update(delta, this.state);
        this.accumulator -= delta;
        this.state.simulationTime += delta;
        this.lastAdvancedDelta += delta;
        this.lastUpdateCount += 1;
      }
      return this.lastUpdateCount;
    }

    const maximumAccumulation = this.simulationDelta * this.maxSubSteps;
    const accumulated = this.accumulator + requestedDelta;
    this.accumulator = Math.min(accumulated, maximumAccumulation);
    this.droppedSimulationTime += accumulated - this.accumulator;

    let steps = 0;
    while (this.accumulator >= this.simulationDelta && steps < this.maxSubSteps) {
      update(this.simulationDelta, this.state);
      this.accumulator -= this.simulationDelta;
      this.state.simulationTime += this.simulationDelta;
      this.lastAdvancedDelta += this.simulationDelta;
      steps += 1;
    }
    this.lastUpdateCount = steps;
    return steps;
  }
}
