import { describe, expect, it } from "vitest";
import { FrameRateController } from "../../src/systems/FrameRateController.js";
import { SimulationClock } from "../../src/systems/SimulationClock.js";

function createStorage(value = null) {
  const values = new Map(value === null ? [] : [["gr4d.maxFps", String(value)]]);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, next) => values.set(key, next), values };
}

describe("FrameRateController", () => {
  it("defaults to 60 FPS and supports every documented cap", () => {
    const controller = new FrameRateController({ storage: createStorage() });
    expect(controller.maxFps).toBe(60);
    for (const value of [30, 45, 60, 90, 120, 0]) expect(() => controller.setMaxFps(value)).not.toThrow();
    expect(() => controller.setMaxFps(24)).toThrow(RangeError);
  });

  it("restores and persists valid values", () => {
    const storage = createStorage(45);
    const controller = new FrameRateController({ storage });
    expect(controller.maxFps).toBe(45);
    controller.setMaxFps(120);
    expect(storage.values.get("gr4d.maxFps")).toBe("120");
  });

  it("caps render cadence while the fixed physics step remains 1/240 s", () => {
    const controller = new FrameRateController({ storage: createStorage() });
    const clock = new SimulationClock();
    controller.setMaxFps(30);
    clock.start(0);
    let renders = 0;
    let physicsSteps = 0;
    for (let timestamp = 0; timestamp <= 1000; timestamp += 1000 / 120) {
      clock.tick(timestamp, () => { physicsSteps += 1; });
      if (controller.shouldRender(timestamp)) renders += 1;
    }
    expect(renders).toBeGreaterThanOrEqual(29);
    expect(renders).toBeLessThanOrEqual(31);
    expect(physicsSteps).toBeGreaterThanOrEqual(238);
    expect(clock.simulationDelta).toBe(1 / 240);
  });

  it("discards hidden-tab timing and prevents a restoration burst", () => {
    const controller = new FrameRateController({ storage: createStorage() });
    controller.shouldRender(0);
    expect(controller.shouldRender(10_000, true)).toBe(false);
    expect(controller.shouldRender(10_016)).toBe(false);
    expect(controller.shouldRender(10_033)).toBe(true);
    expect(controller.renderDelta).toBeLessThan(0.04);
  });
});
