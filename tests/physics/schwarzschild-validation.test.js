import { describe, expect, it } from "vitest";
import {
  GeodesicStatus,
  SchwarzschildGeodesicSystem,
  SchwarzschildUnits,
  createCircularInitialCondition,
  createConstantsInitialCondition,
  createLocalVelocityInitialCondition,
  solarMassesToKilograms,
} from "../../src/physics/index.js";

const units = new SchwarzschildUnits(solarMassesToKilograms(1));

function evolve(initial, normalizedDuration, options = {}) {
  const system = new SchwarzschildGeodesicSystem({
    units,
    maximumNormalizedStep: options.maximumNormalizedStep ?? 0.02,
    maximumSubsteps: options.maximumSubsteps ?? 200000,
  });
  system.initialize(initial);
  system.advanceProperTimeSI(units.normalizedTimeToSI(normalizedDuration));
  return system;
}

describe("long-run Schwarzschild reference validation", () => {
  it("preserves a stable circular orbit for ten proper-time periods", () => {
    const radius = 6;
    const angularMomentum = 2;
    const properTimePeriod = 2 * Math.PI * radius * radius / angularMomentum;
    const system = evolve(createCircularInitialCondition(radius), properTimePeriod * 10);
    expect(system.status).toBe(GeodesicStatus.ACTIVE);
    expect(Math.abs(system.state.values[1] - radius)).toBeLessThan(1e-10);
    expect(system.diagnostics.relativeEnergyDrift).toBeLessThan(1e-11);
    expect(system.diagnostics.relativeAngularMomentumDrift).toBe(0);
    expect(Math.abs(system.diagnostics.normalizationResidual)).toBeLessThan(1e-11);
  });

  it("keeps an eccentric bound trajectory finite over multiple radial cycles", () => {
    const system = evolve(createConstantsInitialCondition(6, 0.965, 2, -1), 1000);
    expect(system.status).toBe(GeodesicStatus.ACTIVE);
    expect(system.diagnostics.minimumRadius).toBeGreaterThan(1.001);
    expect(system.diagnostics.maximumRadius).toBeLessThan(10);
    expect(system.diagnostics.relativeEnergyDrift).toBeLessThan(1e-8);
    expect(Math.abs(system.diagnostics.normalizationResidual)).toBeLessThan(1e-8);
  });

  it("captures a radial plunge without propagating singular values", () => {
    const system = evolve(createLocalVelocityInitialCondition(4, -0.8, 0), 20, { maximumNormalizedStep: 0.001 });
    expect(system.status).toBe(GeodesicStatus.CAPTURED);
    expect(system.state.values.every(Number.isFinite)).toBe(true);
    expect(system.state.values[1]).toBeGreaterThan(system.captureRadius);
    expect(system.diagnostics.relativeEnergyDrift).toBeLessThan(1e-10);
  });

  it("classifies an outward high-energy trajectory at the finite domain", () => {
    const system = evolve(createConstantsInitialCondition(5, 1.2, 0, 1), 20);
    expect(system.status).toBe(GeodesicStatus.OUT_OF_DOMAIN);
    expect(system.state.values[1]).toBeLessThanOrEqual(10);
    expect(system.diagnostics.relativeEnergyDrift).toBeLessThan(1e-10);
  });

  it("converges under timestep refinement", () => {
    const initial = createConstantsInitialCondition(6, 0.97, 2, -1);
    const coarse = evolve(initial, 100, { maximumNormalizedStep: 0.04 });
    const fine = evolve(initial, 100, { maximumNormalizedStep: 0.02 });
    const reference = evolve(initial, 100, { maximumNormalizedStep: 0.01 });
    const coarseError = Math.abs(coarse.state.values[1] - reference.state.values[1]);
    const fineError = Math.abs(fine.state.values[1] - reference.state.values[1]);
    expect(fineError).toBeLessThan(coarseError / 8);
  });

  it("is deterministic and independent of render-frame grouping", () => {
    const initial = createConstantsInitialCondition(6, 0.97, 2, -1);
    const first = evolve(initial, 10);
    const second = evolve(initial, 10);
    expect(Array.from(first.state.values)).toEqual(Array.from(second.state.values));

    const grouped = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: 1000 });
    grouped.initialize(initial);
    for (let frame = 0; frame < 30; frame += 1) {
      for (let fixedUpdate = 0; fixedUpdate < 8; fixedUpdate += 1) {
        grouped.advanceProperTimeSI(units.normalizedTimeToSI(1 / 240));
      }
    }
    const ungrouped = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: 1000 });
    ungrouped.initialize(initial);
    for (let fixedUpdate = 0; fixedUpdate < 240; fixedUpdate += 1) {
      ungrouped.advanceProperTimeSI(units.normalizedTimeToSI(1 / 240));
    }
    expect(Array.from(grouped.state.values)).toEqual(Array.from(ungrouped.state.values));
  });
});
