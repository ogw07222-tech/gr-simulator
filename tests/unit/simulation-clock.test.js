import { describe, expect, it, vi } from "vitest";
import { SimulationClock } from "../../src/systems/SimulationClock.js";
import { SimulationState, TIME_SCALES } from "../../src/systems/SimulationState.js";

describe("SimulationClock", () => {
  it("advances simulation with a fixed 1/240 second timestep", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    const update = vi.fn();
    clock.start(0);

    const steps = clock.tick(10, update);

    expect(steps).toBe(2);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(1 / 240, state);
    expect(state.simulationTime).toBeCloseTo(2 / 240);
  });

  it("continues render time while simulation is paused", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    const update = vi.fn();
    clock.start(0);
    clock.tick(10, update);
    const simulationTime = state.simulationTime;
    clock.pause();

    const steps = clock.tick(20, update);

    expect(steps).toBe(0);
    expect(state.paused).toBe(true);
    expect(state.simulationTime).toBe(simulationTime);
    expect(state.renderTime).toBeCloseTo(0.02);
    expect(state.frame).toBe(2);
  });

  it("resumes fixed-step simulation", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    const update = vi.fn();
    clock.start(0);
    clock.pause();
    clock.tick(10, update);
    clock.resume();

    expect(clock.tick(20, update)).toBe(2);
    expect(state.paused).toBe(false);
  });

  it.each(TIME_SCALES)("supports the %sx time scale", (timeScale) => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });

    expect(() => clock.setTimeScale(timeScale)).not.toThrow();
    expect(state.timeScale).toBe(timeScale);
  });

  it("applies time scale only to simulation time", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    clock.start(0);
    clock.setTimeScale(2);

    expect(clock.tick(10, () => {})).toBe(4);
    expect(state.simulationTime).toBeCloseTo(4 / 240);
    expect(state.renderTime).toBeCloseTo(0.01);
  });

  it("rejects unsupported time scales", () => {
    const clock = new SimulationClock();

    expect(() => clock.setTimeScale(3)).toThrow(RangeError);
  });

  it("resets runtime time and the accumulator", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    clock.start(0);
    clock.tick(10, () => {});

    clock.reset();

    expect(state.frame).toBe(0);
    expect(state.simulationTime).toBe(0);
    expect(state.renderTime).toBe(0);
    expect(clock.accumulator).toBe(0);
  });

  it("clamps frame time and caps substeps to prevent a spiral of death", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state, maxFrameDelta: 0.1, maxSubSteps: 5 });
    clock.start(0);
    clock.setTimeScale(100);

    expect(clock.tick(1000, () => {})).toBe(5);
    expect(clock.renderDelta).toBe(0.1);
    expect(state.simulationTime).toBeCloseTo(5 / 240);
  });
});

describe("SimulationState", () => {
  it("contains runtime state only with stable defaults", () => {
    expect(new SimulationState()).toEqual({
      running: false,
      paused: false,
      timeScale: 1,
      frame: 0,
      simulationTime: 0,
      renderTime: 0,
    });
  });

  it("tracks start and stop independently from pause", () => {
    const state = new SimulationState();
    state.start();
    state.pause();
    state.stop();

    expect(state.running).toBe(false);
    expect(state.paused).toBe(true);
  });
});
