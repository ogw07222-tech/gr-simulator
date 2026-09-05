import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOne(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected exactly one match in ${path}: ${before.slice(0, 80)}`);
  }
  write(path, source.replace(before, after));
}
function replaceSection(path, startMarker, endMarker, replacement) {
  const source = read(path);
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Section markers missing in ${path}`);
  write(path, source.slice(0, start) + replacement + source.slice(end));
}

replaceSection(
  "src/physics/relativity/SchwarzschildNullGeodesicSystem.js",
  "  advanceCoordinateTime(deltaTime) {",
  "  nullCondition(values = this.state.values) {",
`  advanceCoordinateTime(deltaTime) {
    if (this.status !== PhotonStatus.ACTIVE || deltaTime === 0) return 0;
    if (!(deltaTime > 0) || !Number.isFinite(deltaTime)) {
      throw new RangeError("Normalized coordinate-time advance must be positive and finite.");
    }

    const targetTime = this.state.values[I.TIME] + deltaTime;
    let completed = 0;
    while (this.status === PhotonStatus.ACTIVE && this.state.values[I.TIME] < targetTime) {
      const beforeBatchTime = this.state.values[I.TIME];
      let batchSteps = 0;
      while (this.status === PhotonStatus.ACTIVE
        && this.state.values[I.TIME] < targetTime
        && batchSteps < this.maximumSubsteps) {
        const radius = this.state.values[I.RADIUS];
        const lapseSquared = SchwarzschildMetric.lapseSquared(radius);
        const dtDlambda = this.state.energy / lapseSquared;
        const remainingTime = targetTime - this.state.values[I.TIME];
        const affineStep = Math.min(this.maximumAffineStep, remainingTime / dtDlambda);
        if (!(affineStep > 0) || !Number.isFinite(affineStep)) {
          this.status = PhotonStatus.NUMERICAL_FAILURE;
          break;
        }
        const beforeTime = this.state.values[I.TIME];
        const advanced = this.advanceAffine(affineStep);
        completed += advanced;
        batchSteps += 1;
        if (advanced === 0 || this.state.values[I.TIME] <= beforeTime) break;
      }

      if (this.status !== PhotonStatus.ACTIVE || this.state.values[I.TIME] >= targetTime) break;
      if (this.state.values[I.TIME] <= beforeBatchTime) {
        this.status = PhotonStatus.NUMERICAL_FAILURE;
        break;
      }
    }
    return completed;
  }

`);

replaceSection(
  "src/physics/relativity/SchwarzschildGeodesicSystem.js",
  "  advanceProperTimeSI(deltaSeconds) {",
  "  writeRenderPosition(target, scale = 6) {",
`  advanceProperTimeSI(deltaSeconds) {
    if (this.status !== GeodesicStatus.ACTIVE || deltaSeconds === 0) return 0;
    if (!(deltaSeconds > 0) || !Number.isFinite(deltaSeconds)) throw new RangeError("Integration time must be positive and finite.");

    const targetProperTime = this.state.values[I.PROPER_TIME] + this.units.siTimeToNormalized(deltaSeconds);
    const maximumBatchAdvance = this.maximumNormalizedStep * this.maximumSubsteps;
    while (this.status === GeodesicStatus.ACTIVE && this.state.values[I.PROPER_TIME] < targetProperTime) {
      const beforeBatchProperTime = this.state.values[I.PROPER_TIME];
      const remaining = targetProperTime - beforeBatchProperTime;
      const batchAdvance = Math.min(remaining, maximumBatchAdvance);
      const substeps = Math.ceil(batchAdvance / this.maximumNormalizedStep);
      const step = batchAdvance / substeps;

      for (let index = 0; index < substeps; index += 1) {
        const currentRadius = this.state.values[I.RADIUS];
        const currentRadialVelocity = this.state.values[I.RADIAL_VELOCITY];
        if (currentRadialVelocity < 0 && currentRadius + currentRadialVelocity * step <= this.captureRadius) {
          this.status = GeodesicStatus.CAPTURED;
          break;
        }
        this.#rk4(step);
        const radius = this.candidate[I.RADIUS];
        if (!this.#candidateFinite()) {
          this.status = GeodesicStatus.NUMERICAL_FAILURE;
          break;
        }
        if (radius <= this.captureRadius) {
          this.status = GeodesicStatus.CAPTURED;
          break;
        }
        if (radius > this.maximumRadius) {
          this.status = GeodesicStatus.OUT_OF_DOMAIN;
          break;
        }
        this.state.values.set(this.candidate);
        this.diagnostics.substeps += 1;
        this.diagnostics.update(this.state);
      }

      if (this.status !== GeodesicStatus.ACTIVE || this.state.values[I.PROPER_TIME] >= targetProperTime) break;
      if (this.state.values[I.PROPER_TIME] <= beforeBatchProperTime) {
        this.status = GeodesicStatus.NUMERICAL_FAILURE;
        break;
      }
    }
    this.classification = classifyOrbit(this.state, this.status);
    return this.diagnostics.substeps;
  }

`);

{
  const path = "src/main.js";
  let source = read(path);
  const line = "clock.setHighSpeedDelta(geodesicSubsystem.maximumSafeAdvanceSeconds());\n";
  const count = source.split(line).length - 1;
  if (count !== 2) throw new Error(`Expected two legacy high-speed throttle calls, found ${count}`);
  source = source.split(line).join("");
  write(path, source);
}

replaceOne(
  "src/systems/SchwarzschildParticleSubsystem.js",
`  maximumSafeAdvanceSeconds() {
    return this.units.normalizedTimeToSI(
      this.geodesic.maximumNormalizedStep * this.geodesic.maximumSubsteps,
    );
  }
`,
`  maximumSafeAdvanceSeconds() {
    // Legacy helper: this is the capacity of one bounded solver batch, not a
    // limit on a runtime request. advanceProperTimeSI() repeats batches until
    // the requested interval is consumed or the physical trajectory terminates.
    return this.units.normalizedTimeToSI(
      this.geodesic.maximumNormalizedStep * this.geodesic.maximumSubsteps,
    );
  }
`);

replaceOne(
  "src/ui/i18n/en.js",
  "displayUnits: { section: \"Display Units\", mode: \"Unit system\", automatic: \"Automatic\", si: \"SI\", astronomical: \"Astronomical\", note: \"Display conversion only; physics always remains in SI units.\" }",
  "displayUnits: { section: \"Display Units\", mode: \"Unit system\", automatic: \"Automatic\", si: \"SI\", astronomical: \"Astronomical\", note: \"Changing display units does not change the physical state. The geodesic solver integrates in normalized Schwarzschild units and converts quantities to/from SI at the interface.\" }",
);
replaceOne(
  "src/ui/i18n/en.js",
  "integrator: \"Classical RK4 · normalized step ≤ 0.02 · maximum 128 substeps per runtime update\"",
  "integrator: \"Classical RK4 · normalized step ≤ 0.02 · default 128 substeps per solver batch · larger runtime intervals use repeated bounded batches\"",
);
replaceOne(
  "src/ui/i18n/en.js",
  "integrator: { title: \"Integrator and step controls\", body: \"The engine uses a fixed 1/240 s runtime step and classical RK4. The solver limits normalized substeps to 0.02 and caps work per update. Raise the cap only when a valid trajectory reports insufficient substeps.\" }",
  "integrator: { title: \"Integrator and step controls\", body: \"The engine uses a fixed 1/240 s runtime step and classical RK4. Each solver batch is bounded by the configured normalized step and substep count. Larger requested physical intervals are consumed deterministically through repeated bounded batches rather than discarded.\" }",
);

replaceOne(
  "src/ui/i18n/ko.js",
  "displayUnits: { section: \"표시 단위\", mode: \"단위 체계\", automatic: \"자동\", si: \"SI\", astronomical: \"천문학\", note: \"표시만 변환하며 물리 계산은 항상 SI 단위를 유지합니다.\" }",
  "displayUnits: { section: \"표시 단위\", mode: \"단위 체계\", automatic: \"자동\", si: \"SI\", astronomical: \"천문학\", note: \"표시 단위를 바꿔도 물리 상태는 변하지 않습니다. 측지선 솔버는 정규화된 슈바르츠실트 단위로 적분하고 경계에서 물리량을 SI와 상호 변환합니다.\" }",
);
replaceOne(
  "src/ui/i18n/ko.js",
  "integrator: \"고전 RK4 · 정규화 스텝 ≤ 0.02 · 런타임 갱신당 최대 128 서브스텝\"",
  "integrator: \"고전 RK4 · 정규화 스텝 ≤ 0.02 · 솔버 배치당 기본 128 서브스텝 · 큰 런타임 간격은 제한된 배치를 반복해 처리\"",
);
replaceOne(
  "src/ui/i18n/ko.js",
  "integrator: { title: \"적분기와 스텝 제어\", body: \"엔진은 1/240초 고정 런타임 스텝과 고전적 RK4를 사용합니다. 솔버는 정규화 하위 스텝을 0.02로 제한하고 업데이트당 계산량을 제한합니다.\" }",
  "integrator: { title: \"적분기와 스텝 제어\", body: \"엔진은 1/240초 고정 런타임 스텝과 고전적 RK4를 사용합니다. 각 솔버 배치는 설정된 정규화 스텝과 서브스텝 수로 제한됩니다. 더 큰 물리 시간 요청은 버리지 않고 제한된 배치를 결정론적으로 반복해 모두 처리합니다.\" }",
);

replaceOne(
  "docs/UNIT_SYSTEM.md",
`Public conversion APIs name SI explicitly. Radius conversions use metres, time conversions use seconds, velocity conversions use metres per second, and SI specific angular momentum uses square metres per second. One solar mass gives \`r_s = 2953.339382066878 m\`, preventing the common factor-of-two error.

## Presentation units`,
`Public conversion APIs name SI explicitly. Radius conversions use metres, time conversions use seconds, velocity conversions use metres per second, and SI specific angular momentum uses square metres per second. One solar mass gives \`r_s = 2953.339382066878 m\`, preventing the common factor-of-two error.

## Runtime-to-solver stepping contract

Runtime intervals are physical SI intervals at the subsystem boundary, then converted with \`t_s=r_s/c\` to the solver's normalized Schwarzschild time scale. A runtime request is not required to fit inside one numerical work batch.

For timelike motion, \`advanceProperTimeSI(Δτ)\` converts the requested proper-time interval to normalized \`Δs=cΔτ/r_s\`. Each numerical batch advances at most \`maximumNormalizedStep × maximumSubsteps\`; if the trajectory remains active, additional bounded batches are executed until the complete requested interval has been consumed. Capture or finite-domain termination can end a trajectory before the request is exhausted, but scheduler capacity alone does not discard time or produce \`NUMERICAL_FAILURE\`.

For null motion, runtime progression is Schwarzschild coordinate time. \`advanceCoordinateTimeSI(Δt)\` converts the requested coordinate-time interval through \`t_s\`, while the geodesic remains affine-parametrized. The solver uses \`dt̄/dλ̄ = E/f(r̄)\`, \`f(r̄)=1-1/r̄\`, to choose bounded affine steps and repeats batches of at most \`maximumSubsteps\` until the coordinate-time target is reached or the trajectory physically terminates. Photon proper time is never introduced, and affine normalization changes parameter scale rather than the geometric path.

The normalized RK4 step limits, geodesic equations, capture/escape boundaries, and scientific residual tolerances are unchanged by this scheduling policy.

## Presentation units`);

replaceOne(
  "docs/PHYSICS.md",
`Photon runtime updates use Schwarzschild **coordinate time**, not photon proper time and not a direct assumption that affine parameter equals seconds. For each runtime \`deltaSeconds\`, the null solver targets the corresponding SI coordinate-time increment, converts it to normalized Schwarzschild time through \`r_s/c\`, and advances the affine parameter through the existing relation \`dt/dλ = E/f(r)\` while retaining the validated RK4 null equations and affine-step limit. Render positions continue to come only from the integrated authoritative null state.`,
`Photon runtime updates use Schwarzschild **coordinate time**, not photon proper time and not a direct assumption that affine parameter equals seconds. For each runtime \`deltaSeconds\`, the null solver targets the corresponding SI coordinate-time increment, converts it to normalized Schwarzschild time through \`r_s/c\`, and advances the affine parameter through the existing relation \`dt/dλ = E/f(r)\`. The coordinate-time request may span multiple bounded numerical batches; each batch respects the existing affine-step and substep limits, and active trajectories repeat batches until the complete target interval is consumed. Render positions continue to come only from the integrated authoritative null state.`,
);
replaceOne(
  "docs/PHYSICS.md",
  "The existing massive/timelike solver is unchanged.",
  "The massive/timelike geodesic equations are unchanged; its runtime scheduler now follows the same no-time-loss bounded-batch contract for large proper-time requests.",
);

replaceOne(
  "tests/unit/schwarzschild-geodesics.test.js",
`  it("reports invalid input, domain exit, and a substep safety failure", () => {
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
  });`,
`  it("reports invalid input and domain exit while splitting oversized requests into bounded batches", () => {
    const invalid = new SchwarzschildGeodesicSystem({ units });
    expect(() => invalid.initialize(createCircularInitialCondition(11))).toThrow(RangeError);
    expect(invalid.status).toBe(GeodesicStatus.INVALID_INITIAL_CONDITION);

    const escaping = new SchwarzschildGeodesicSystem({ units, maximumNormalizedStep: 0.01, maximumSubsteps: 100 });
    escaping.initialize(createConstantsInitialCondition(9.99, 1.2, 0, 1));
    escaping.advanceProperTimeSI(units.normalizedTimeToSI(0.1));
    expect(escaping.status).toBe(GeodesicStatus.OUT_OF_DOMAIN);

    const limited = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: 1 });
    limited.initialize(createCircularInitialCondition(6));
    limited.advanceProperTimeSI(units.normalizedTimeToSI(1));
    expect(limited.status).toBe(GeodesicStatus.ACTIVE);
    expect(limited.properTimeSI()).toBeCloseTo(units.normalizedTimeToSI(1), 12);
    expect(limited.diagnostics.substeps).toBe(50);
  });`);

write("tests/physics/runtime-stepping-audit.test.js", `import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GeodesicStatus,
  PhotonStatus,
  SchwarzschildGeodesicSystem,
  SchwarzschildNullGeodesicSystem,
  SchwarzschildUnits,
  createCircularInitialCondition,
  createConstantsInitialCondition,
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
    const second = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100 });
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
      preset: "constants", radius: 6, energy: 0.97, angularMomentum: 2, radialDirection: -1, maximumSubsteps: 128,
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
`);

console.log("Applied PHOTON-AUDIT-008/014/015 implementation patch.");
