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

  it("accepts decimal custom scales within the configured range", () => {
    const state = new SimulationState();
    state.setTimeScale(37.5);
    expect(state.timeScale).toBe(37.5);
    state.setTimeScale(0.01);
    state.setTimeScale(100000);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.009, 100001])("rejects invalid time scale %s", (value) => {
    expect(() => new SimulationState({ timeScale: value })).toThrow(RangeError);
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

    expect(() => clock.setTimeScale(0.001)).toThrow(RangeError);
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

  it("synchronizes after a hidden interval without catch-up work", () => {
    const clock = new SimulationClock();
    const update = vi.fn();
    clock.start(0);
    clock.tick(10, update);
    clock.synchronize(10_000);
    expect(clock.tick(10_016, update)).toBeLessThanOrEqual(4);
    expect(clock.renderDelta).toBeCloseTo(0.016);
  });

  it("advances high requested scales monotonically without silently dropping backlog", () => {
    const advances = [1, 100, 1000, 10000, 100000].map((timeScale) => {
      const state = new SimulationState({ timeScale });
      const clock = new SimulationClock({ state });
      clock.start(0);
      for (let frame = 1; frame <= 60; frame += 1) clock.tick(frame * (1000 / 60), () => {});
      expect(clock.droppedSimulationTime).toBeCloseTo(0);
      return state.simulationTime;
    });
    expect(advances[1]).toBeGreaterThan(advances[0]);
    expect(advances[2]).toBeGreaterThan(advances[1]);
    expect(advances[3]).toBeGreaterThan(advances[2]);
    expect(advances[4]).toBeGreaterThan(advances[3]);
  });

  it("produces the same unsaturated advancement across render frame rates", () => {
    const run = (frames) => {
      const state = new SimulationState({ timeScale: 1000 });
      const clock = new SimulationClock({ state });
      clock.start(0);
      for (let frame = 1; frame <= frames; frame += 1) clock.tick(frame * (1000 / frames), () => {});
      return state.simulationTime;
    };
    expect(run(30)).toBeCloseTo(run(60), 8);
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
