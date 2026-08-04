import { describe, expect, it } from "vitest";
import {
  GeodesicStatus,
  OrbitClassification,
  SchwarzschildGeodesicSystem,
  SchwarzschildMetric,
  SchwarzschildUnits,
  circularOrbitConstants,
  classifyOrbit,
  createCircularInitialCondition,
  createConstantsInitialCondition,
  createLocalVelocityInitialCondition,
  effectivePotential,
  iscoRadius,
  marginallyBoundRadius,
  photonSphereRadius,
  solarMassesToKilograms,
} from "../../src/physics/index.js";

const units = new SchwarzschildUnits(solarMassesToKilograms(4e6));

describe("Schwarzschild metric and conserved quantities", () => {
  it("approaches flat spacetime and rejects the coordinate horizon", () => {
    expect(SchwarzschildMetric.lapseSquared(1e9)).toBeCloseTo(1, 8);
    expect(SchwarzschildMetric.components(4)).toEqual(new Float64Array([-0.75, 4 / 3, 16, 16]));
    expect(() => SchwarzschildMetric.components(1)).toThrow(RangeError);
  });

  it("uses the r_s convention for landmark radii", () => {
    expect(photonSphereRadius()).toBe(1.5);
    expect(marginallyBoundRadius()).toBe(2);
    expect(iscoRadius()).toBe(3);
  });

  it("matches analytic circular-orbit constants", () => {
    expect(circularOrbitConstants(2)).toEqual({ energy: 1, angularMomentum: 2 });
    const isco = circularOrbitConstants(3);
    expect(isco.energy).toBeCloseTo(Math.sqrt(8 / 9), 14);
    expect(isco.angularMomentum).toBeCloseTo(Math.sqrt(3), 14);
  });

  it("creates equivalent circular and local-observer initial conditions", () => {
    const circular = createCircularInitialCondition(6);
    const constants = circularOrbitConstants(6);
    const gamma = constants.energy / Math.sqrt(SchwarzschildMetric.lapseSquared(6));
    const local = createLocalVelocityInitialCondition(6, 0, constants.angularMomentum / (gamma * 6));
    expect(local.energy).toBeCloseTo(circular.energy, 14);
    expect(local.angularMomentum).toBeCloseTo(circular.angularMomentum, 14);
    expect(local.radialVelocity).toBe(0);
  });

  it("derives a radial velocity from the effective potential", () => {
    const initial = createConstantsInitialCondition(6, 0.97, 2, -1);
    expect(initial.radialVelocity).toBeLessThan(0);
    expect(initial.radialVelocity ** 2 + effectivePotential(6, 2)).toBeCloseTo(0.97 ** 2, 14);
    expect(() => createConstantsInitialCondition(2, 0.5, 2)).toThrow(RangeError);
    expect(() => createConstantsInitialCondition(6, Infinity, 2)).toThrow(RangeError);
  });

  it("recovers the far-field potential and radial-fall acceleration", () => {
    const radius = 1e6;
    const angularMomentum = 2;
    const expected = (1 - 1 / radius) * (1 + angularMomentum ** 2 / radius ** 2);
    expect(effectivePotential(radius, angularMomentum)).toBeCloseTo(expected, 15);
    const radial = createConstantsInitialCondition(6, 1, 0, -1);
    expect(radial.angularMomentum).toBe(0);
  });
});

describe("Schwarzschild geodesic integration", () => {
  it("preserves an analytic stable circular orbit", () => {
    const system = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: 1000 });
    system.initialize(createCircularInitialCondition(6));
    system.advanceProperTimeSI(units.normalizedTimeToSI(10));
    expect(system.state.values[1]).toBeCloseTo(6, 11);
    expect(system.diagnostics.relativeEnergyDrift).toBeLessThan(1e-11);
    expect(system.classification).toBe(OrbitClassification.STABLE_CIRCULAR);
  });

  it("advances coordinate and proper time independently", () => {
    const system = new SchwarzschildGeodesicSystem({ units });
    system.initialize(createCircularInitialCondition(6));
    system.advanceProperTimeSI(units.normalizedTimeToSI(1));
    expect(system.properTimeSI()).toBeCloseTo(units.normalizedTimeToSI(1), 12);
    expect(system.coordinateTimeSI()).toBeGreaterThan(system.properTimeSI());
  });

  it("classifies stable, unstable, bound, and scattering states", () => {
    const stable = new SchwarzschildGeodesicSystem({ units }).initialize(createCircularInitialCondition(6));
    const unstable = new SchwarzschildGeodesicSystem({ units }).initialize(createCircularInitialCondition(2.5));
    const bound = new SchwarzschildGeodesicSystem({ units }).initialize(
      createConstantsInitialCondition(6, 0.97, 2, -1),
    );
    const scattering = new SchwarzschildGeodesicSystem({ units }).initialize(
      createLocalVelocityInitialCondition(5, 0.6, 0),
    );
    expect(classifyOrbit(stable.state, stable.status)).toBe(OrbitClassification.STABLE_CIRCULAR);
    expect(classifyOrbit(unstable.state, unstable.status)).toBe(OrbitClassification.UNSTABLE_CIRCULAR);
    expect(classifyOrbit(bound.state, bound.status)).toBe(OrbitClassification.BOUND_NON_CIRCULAR);
    expect(classifyOrbit(scattering.state, scattering.status)).toBe(OrbitClassification.UNBOUND_SCATTERING);
  });

  it("reports invalid input, domain exit, and a substep safety failure", () => {
    const invalid = new SchwarzschildGeodesicSystem({ units });
    expect(() => invalid.initialize(createCircularInitialCondition(11))).toThrow(RangeError);
    expect(invalid.status).toBe(GeodesicStatus.INVALID_INITIAL_CONDITION);

    const escaping = new SchwarzschildGeodesicSystem({ units, maximumNormalizedStep: 0.01, maximumSubsteps: 100 });
    escaping.initialize(createConstantsInitialCondition(9.99, 1.2, 0, 1));
    escaping.advanceProperTimeSI(units.normalizedTimeToSI(0.1));
    expect(escaping.status).toBe(GeodesicStatus.OUT_OF_DOMAIN);

    const limited = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: 1 });
    limited.initialize(createCircularInitialCondition(6));
    expect(limited.advanceProperTimeSI(units.normalizedTimeToSI(1))).toBe(0);
    expect(limited.status).toBe(GeodesicStatus.NUMERICAL_FAILURE);
  });
});
