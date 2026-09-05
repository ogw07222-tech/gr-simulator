import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GeodesicStatus,
  PhotonStatus,
  SchwarzschildGeodesicSystem,
  SchwarzschildNullGeodesicSystem,
  SchwarzschildUnits,
  createCircularInitialCondition,
  createLocalVelocityInitialCondition,
  nullRadialVelocity,
  solarMassesToKilograms,
} from "../../src/physics/index.js";
import {
  ParticleManager,
  PhotonSubsystem,
  SchwarzschildParticleSubsystem,
  SimulationClock,
  SimulationState,
} from "../../src/systems/index.js";
import { en } from "../../src/ui/i18n/en.js";
import { ko } from "../../src/ui/i18n/ko.js";

const MASSES_SOLAR = [1, 5, 10, 20, 100, 4e6, 1e10];
const RUNTIME_TICK_SECONDS = 1 / 240;
const B_CRIT = 3 * Math.sqrt(3) / 2;

function unitsFor(massSolar) {
  return new SchwarzschildUnits(solarMassesToKilograms(massSolar));
}

function timelikeSubsystem(massSolar, configuration) {
  const particles = new ParticleManager({ maxParticles: 4, maxTrailLength: 32, domainHalfExtent: 75 });
  const subsystem = new SchwarzschildParticleSubsystem({ particles });
  subsystem.apply({ massSolar, ...configuration });
  return subsystem;
}

function expectNoTimelikeSchedulerFailure(system) {
  expect(system.status).not.toBe(GeodesicStatus.NUMERICAL_FAILURE);
  expect(system.diagnostics.relativeEnergyDrift).toBeLessThan(1e-8);
  expect(system.diagnostics.relativeAngularMomentumDrift).toBe(0);
  expect(Math.abs(system.diagnostics.normalizationResidual)).toBeLessThan(1e-8);
}

describe("PHOTON-AUDIT-008 photon runtime scheduling", () => {
  it.each(MASSES_SOLAR)("advances a general photon at %s M_sun without scheduler failure", (massSolar) => {
    const photons = new PhotonSubsystem({ enabled: true, massSolar, photonCount: 1, maximumRadius: 200 });
    photons.update(RUNTIME_TICK_SECONDS);
    expect(photons.geodesic.status).not.toBe(PhotonStatus.NUMERICAL_FAILURE);
    expect(photons.geodesic.diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);
  });

  it.each(MASSES_SOLAR)("advances the Light Bending bundle at %s M_sun without scheduler failure", (massSolar) => {
    const photons = new PhotonSubsystem({ enabled: true, massSolar });
    photons.applyLightBendingDemo();
    photons.setEnabled(true);
    photons.update(RUNTIME_TICK_SECONDS);
    for (let index = 0; index < photons.count(); index += 1) {
      expect(photons.geodesicAt(index).status).not.toBe(PhotonStatus.NUMERICAL_FAILURE);
    }
  });

  it("fully consumes a low-mass coordinate-time request while retaining affine parametrization", () => {
    const units = unitsFor(1);
    const photon = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100 });
    photon.initialize({ radius: 1.5, phi: 0, energy: 1, angularMomentum: B_CRIT, radialVelocity: 0 });
    const beforeTime = photon.coordinateTimeSI();
    const beforeAffine = photon.affineParameter();
    photon.advanceCoordinateTimeSI(RUNTIME_TICK_SECONDS);
    const consumed = photon.coordinateTimeSI() - beforeTime;
    expect(photon.status).toBe(PhotonStatus.ACTIVE);
    expect(Math.abs(consumed - RUNTIME_TICK_SECONDS)).toBeLessThan(1e-12);
    expect(photon.affineParameter()).toBeGreaterThan(beforeAffine);
    expect(photon.diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);
  });

  it("keeps the geometric trajectory invariant under affine normalization", () => {
    const units = unitsFor(4e6);
    const radius = 20;
    const b = 4;
    const first = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100 });
    const second = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100, maximumAffineStep: 0.02 / 3 });
    first.initialize({ radius, energy: 1, angularMomentum: b, radialVelocity: nullRadialVelocity(radius, 1, b, -1) });
    second.initialize({ radius, energy: 3, angularMomentum: 3 * b, radialVelocity: nullRadialVelocity(radius, 3, 3 * b, -1) });
    first.advanceCoordinateTime(0.5);
    second.advanceCoordinateTime(0.5);
    expect(second.state.values[1]).toBeCloseTo(first.state.values[1], 11);
    expect(second.state.values[2]).toBeCloseTo(first.state.values[2], 11);
  });
});

describe("PHOTON-AUDIT-014 timelike runtime scheduling", () => {
  it.each(MASSES_SOLAR)("consumes a stable and non-circular runtime tick at %s M_sun", (massSolar) => {
    const circular = timelikeSubsystem(massSolar, { preset: "circular", radius: 6, maximumSubsteps: 128 });
    const beforeCircular = circular.geodesic.properTimeSI();
    circular.update(RUNTIME_TICK_SECONDS);
    expect(circular.geodesic.status).toBe(GeodesicStatus.ACTIVE);
    expect(circular.geodesic.properTimeSI() - beforeCircular).toBeCloseTo(RUNTIME_TICK_SECONDS, 11);
    expectNoTimelikeSchedulerFailure(circular.geodesic);

    const eccentric = timelikeSubsystem(massSolar, {
      preset: "precession", eccentricity: 0.3, maximumSubsteps: 128,
    });
    const beforeEccentric = eccentric.geodesic.properTimeSI();
    eccentric.update(RUNTIME_TICK_SECONDS);
    expect(eccentric.geodesic.status).toBe(GeodesicStatus.ACTIVE);
    expect(eccentric.geodesic.properTimeSI() - beforeEccentric).toBeCloseTo(RUNTIME_TICK_SECONDS, 11);
    expectNoTimelikeSchedulerFailure(eccentric.geodesic);
  });

  it("handles low-mass plunge and scattering termination without scheduler failure", () => {
    const units = unitsFor(1);
    const plunge = new SchwarzschildGeodesicSystem({ units, maximumNormalizedStep: 0.001 });
    plunge.initialize(createLocalVelocityInitialCondition(4, -0.8, 0));
    plunge.advanceProperTimeSI(RUNTIME_TICK_SECONDS);
    expect(plunge.status).toBe(GeodesicStatus.CAPTURED);
    expect(plunge.state.values.every(Number.isFinite)).toBe(true);
    expect(plunge.diagnostics.relativeEnergyDrift).toBeLessThan(1e-10);

    const scattering = new SchwarzschildGeodesicSystem({ units });
    scattering.initialize(createLocalVelocityInitialCondition(5, 0.6, 0));
    scattering.advanceProperTimeSI(RUNTIME_TICK_SECONDS);
    expect(scattering.status).toBe(GeodesicStatus.OUT_OF_DOMAIN);
    expect(scattering.state.values.every(Number.isFinite)).toBe(true);
    expect(scattering.diagnostics.relativeEnergyDrift).toBeLessThan(1e-10);
  });

  it("no longer binds global high-speed runtime callbacks to one timelike solver batch", () => {
    const main = fs.readFileSync("src/main.js", "utf8");
    expect(main).not.toContain("clock.setHighSpeedDelta(geodesicSubsystem.maximumSafeAdvanceSeconds())");
  });
});

describe("requested versus consumed physical time", () => {
  it.each([1, 50, 1000])("consumes the requested solver interval at %sx", (timeScale) => {
    const requested = RUNTIME_TICK_SECONDS * timeScale;
    const units = unitsFor(4e6);

    const photon = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100 });
    photon.initialize({ radius: 1.5, phi: 0, energy: 1, angularMomentum: B_CRIT, radialVelocity: 0 });
    const photonStart = photon.coordinateTimeSI();
    photon.advanceCoordinateTimeSI(requested);
    expect(Math.abs((photon.coordinateTimeSI() - photonStart) - requested)).toBeLessThan(Math.max(1e-12, requested * 1e-10));
    expect(photon.status).toBe(PhotonStatus.ACTIVE);

    const timelike = new SchwarzschildGeodesicSystem({ units });
    timelike.initialize(createCircularInitialCondition(6));
    const timelikeStart = timelike.properTimeSI();
    timelike.advanceProperTimeSI(requested);
    expect(timelike.properTimeSI() - timelikeStart).toBeCloseTo(requested, 11);
    expect(timelike.status).toBe(GeodesicStatus.ACTIVE);
  });

  it.each([1, 50, 1000])("keeps clock requested and effective advancement aligned at %sx", (timeScale) => {
    const state = new SimulationState({ timeScale });
    const clock = new SimulationClock({ state });
    const subsystem = timelikeSubsystem(4e6, { preset: "circular", radius: 6 });
    const wallSeconds = 1 / 60;
    clock.start(0);
    clock.tick(wallSeconds * 1000, (delta) => subsystem.update(delta));
    const requested = wallSeconds * timeScale;
    expect(state.simulationTime).toBeCloseTo(requested, 10);
    expect(subsystem.geodesic.properTimeSI()).toBeCloseTo(state.simulationTime, 10);
    expect(clock.droppedSimulationTime).toBeCloseTo(0, 12);
  });
});

describe("PHOTON-AUDIT-015 unit wording", () => {
  it("states the normalized solver / SI interface accurately in both locales", () => {
    expect(en.displayUnits.note).toContain("normalized Schwarzschild units");
    expect(en.displayUnits.note).toContain("SI");
    expect(en.displayUnits.note).not.toContain("physics always remains in SI units");
    expect(ko.displayUnits.note).toContain("정규화된 슈바르츠실트 단위");
    expect(ko.displayUnits.note).toContain("SI");
  });
});
