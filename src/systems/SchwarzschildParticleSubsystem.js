import {
  GeodesicStateIndex,
  GeodesicStatus,
  PHYSICAL_CONSTANTS,
  SchwarzschildGeodesicSystem,
  SchwarzschildUnits,
  createCircularInitialCondition,
  createConstantsInitialCondition,
  createLocalVelocityInitialCondition,
  solarMassesToKilograms,
} from "../physics/index.js";
import { ParticleState } from "./particles/index.js";

const DEFAULT_RENDER_SCALE = 1;
const MINIMUM_TRAIL_DISPLACEMENT_SQUARED = 0.02 ** 2;

export const PRECESSION_DEMO = Object.freeze({
  semiLatusRectumM: 9,
  minimumEccentricity: 0.05,
  maximumEccentricity: 0.5,
  defaultEccentricity: 0.3,
  minimumRadiusRs: 1.001,
  maximumRadiusRs: 10,
  startAt: "periapsis",
});

export function derivePrecessionDemoOrbit(eccentricity) {
  if (!Number.isFinite(eccentricity)
    || eccentricity < PRECESSION_DEMO.minimumEccentricity
    || eccentricity > PRECESSION_DEMO.maximumEccentricity) {
    throw new RangeError(
      `Precession demo eccentricity must be between ${PRECESSION_DEMO.minimumEccentricity} and ${PRECESSION_DEMO.maximumEccentricity}.`,
    );
  }

  // p follows the standard Darwin convention in M_geo=GM/c^2 units. The engine
  // stores radii in r_s=2M_geo units, so both turning radii contain an explicit 1/2.
  const p = PRECESSION_DEMO.semiLatusRectumM;
  if (!(p > 6 + 2 * eccentricity)) {
    throw new RangeError("Precession demo orbit must remain outside the Schwarzschild separatrix.");
  }

  const denominator = p - 3 - eccentricity * eccentricity;
  const periapsisRadius = p / (2 * (1 + eccentricity));
  const apocenterRadius = p / (2 * (1 - eccentricity));
  if (!(periapsisRadius > PRECESSION_DEMO.minimumRadiusRs)
    || !(apocenterRadius <= PRECESSION_DEMO.maximumRadiusRs)) {
    throw new RangeError("Precession demo turning points exceed the supported Schwarzschild solver domain.");
  }

  const energySquared = ((p - 2 - 2 * eccentricity) * (p - 2 + 2 * eccentricity))
    / (p * denominator);
  const energy = Math.sqrt(energySquared);
  // Standard L/M_geo is p/sqrt(p-3-e^2). The engine stores lambda=L/(c r_s),
  // hence another explicit factor of 1/2 because r_s=2M_geo.
  const angularMomentum = p / (2 * Math.sqrt(denominator));
  if (!Number.isFinite(energy) || !Number.isFinite(angularMomentum) || !(energy > 0 && energy < 1)) {
    throw new RangeError("Precession demo conserved quantities are not finite bound-orbit values.");
  }

  const initialCondition = createConstantsInitialCondition(
    periapsisRadius,
    energy,
    angularMomentum,
    1,
  );
  const lapseSquared = 1 - 1 / periapsisRadius;
  const gamma = energy / Math.sqrt(lapseSquared);
  const tangentialBeta = angularMomentum / (gamma * periapsisRadius);
  if (!Number.isFinite(tangentialBeta) || !(tangentialBeta >= 0 && tangentialBeta < 1)) {
    throw new RangeError("Precession demo initial local velocity is not timelike.");
  }

  return Object.freeze({
    eccentricity,
    semiLatusRectumM: p,
    periapsisRadius,
    apocenterRadius,
    startingRadius: periapsisRadius,
    energy,
    angularMomentum,
    radialBeta: 0,
    tangentialBeta,
    radialDirection: 1,
    expectedClassification: "BoundNonCircular",
    startAt: PRECESSION_DEMO.startAt,
    initialCondition,
  });
}

function createInitialCondition(configuration) {
  if (configuration.preset === "local") {
    return createLocalVelocityInitialCondition(
      configuration.radius,
      configuration.radialBeta,
      configuration.tangentialBeta,
    );
  }
  if (configuration.preset === "constants") {
    return createConstantsInitialCondition(
      configuration.radius,
      configuration.energy,
      configuration.angularMomentum,
      configuration.radialDirection,
    );
  }
  return createCircularInitialCondition(configuration.radius);
}

function withoutDemoMetadata(configuration) {
  const next = { ...configuration };
  delete next.semiLatusRectumM;
  delete next.periapsisRadius;
  delete next.apocenterRadius;
  delete next.startingPoint;
  return next;
}

function resolveInitialCondition(configuration) {
  if (configuration.preset !== "precession") {
    const next = withoutDemoMetadata(configuration);
    return { configuration: next, initialCondition: createInitialCondition(next) };
  }

  const demo = derivePrecessionDemoOrbit(configuration.eccentricity);
  return {
    configuration: {
      ...configuration,
      radius: demo.startingRadius,
      radialBeta: demo.radialBeta,
      tangentialBeta: demo.tangentialBeta,
      energy: demo.energy,
      angularMomentum: demo.angularMomentum,
      radialDirection: demo.radialDirection,
      semiLatusRectumM: demo.semiLatusRectumM,
      periapsisRadius: demo.periapsisRadius,
      apocenterRadius: demo.apocenterRadius,
      startingPoint: demo.startAt,
    },
    initialCondition: demo.initialCondition,
  };
}

export class SchwarzschildParticleSubsystem {
  constructor({ particles, particleId = "default-particle", renderScale = DEFAULT_RENDER_SCALE } = {}) {
    if (!particles) throw new TypeError("SchwarzschildParticleSubsystem requires a ParticleManager.");
    this.order = 50;
    this.particles = particles;
    this.particleId = particleId;
    this.renderScale = renderScale;
    this.configuration = {
      massSolar: 4e6,
      radius: 6,
      preset: "circular",
      eccentricity: PRECESSION_DEMO.defaultEccentricity,
      radialBeta: 0,
      tangentialBeta: 0,
      energy: 1,
      angularMomentum: 0,
      radialDirection: 1,
      maximumSubsteps: 128,
    };
    this.units = new SchwarzschildUnits(solarMassesToKilograms(this.configuration.massSolar));
    this.geodesic = new SchwarzschildGeodesicSystem({ units: this.units });
    this.particle = null;
    this.apply(this.configuration);
  }

  previewPrecessionDemo(eccentricity) {
    return derivePrecessionDemoOrbit(eccentricity);
  }

  apply(configuration) {
    const requested = { ...this.configuration, ...configuration };
    const resolved = resolveInitialCondition(requested);
    const next = resolved.configuration;
    const units = new SchwarzschildUnits(solarMassesToKilograms(next.massSolar));
    const geodesic = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: next.maximumSubsteps });
    geodesic.initialize(resolved.initialCondition);

    this.configuration = next;
    this.units = units;
    this.geodesic = geodesic;
    if (!this.particle) {
      this.particle = this.particles.create({
        id: this.particleId,
        restMass: 1,
        radius: 0.22,
        color: 0xffd166,
        state: ParticleState.ORBITING,
      });
    }
    this.particle.trail.clear();
    this.#syncParticle(false);
    return this;
  }

  reset() { return this.apply(this.configuration); }

  maximumSafeAdvanceSeconds() {
    // Legacy helper: this is the capacity of one bounded solver batch, not a
    // limit on a runtime request. advanceProperTimeSI() repeats batches until
    // the requested interval is consumed or the physical trajectory terminates.
    return this.units.normalizedTimeToSI(
      this.geodesic.maximumNormalizedStep * this.geodesic.maximumSubsteps,
    );
  }

  update(deltaSeconds) {
    if (this.geodesic.status !== GeodesicStatus.ACTIVE) return;
    this.geodesic.advanceProperTimeSI(deltaSeconds);
    this.#syncParticle(true);
  }

  writeSnapshot(target) {
    const values = this.geodesic.state.values;
    const radius = values[GeodesicStateIndex.RADIUS];
    const lapseSquared = 1 - 1 / radius;
    const gamma = this.geodesic.state.energy / Math.sqrt(lapseSquared);
    const radialBeta = values[GeodesicStateIndex.RADIAL_VELOCITY] / (gamma * Math.sqrt(lapseSquared));
    const tangentialBeta = this.geodesic.state.angularMomentum / (gamma * radius);
    const speedFraction = Math.sqrt(radialBeta * radialBeta + tangentialBeta * tangentialBeta);
    target.geodesicStatus = this.geodesic.status;
    target.orbitClassification = this.geodesic.classification;
    target.massSolar = this.configuration.massSolar;
    target.massKg = this.units.massKg;
    target.schwarzschildRadiusMetres = this.units.lengthScale;
    target.radiusRs = radius;
    target.radiusMetres = this.units.normalizedRadiusToSI(radius);
    target.coordinateTime = this.geodesic.coordinateTimeSI();
    target.properTime = this.geodesic.properTimeSI();
    target.localSpeedFraction = speedFraction;
    target.localSpeedMetresPerSecond = speedFraction * PHYSICAL_CONSTANTS.speedOfLight;
    target.radialSpeedFraction = radialBeta;
    target.tangentialSpeedFraction = tangentialBeta;
    target.energy = this.geodesic.state.energy;
    target.angularMomentum = this.geodesic.state.angularMomentum;
    target.angularMomentumSI = this.units.normalizedSpecificAngularMomentumToSI(this.geodesic.state.angularMomentum);
    target.energyDrift = this.geodesic.diagnostics.relativeEnergyDrift;
    target.angularMomentumDrift = this.geodesic.diagnostics.relativeAngularMomentumDrift;
    target.normalizationResidual = this.geodesic.diagnostics.normalizationResidual;
    target.integrationSubsteps = this.geodesic.diagnostics.substeps;
    target.radialPeriods = this.geodesic.diagnostics.radialPeriods;
    target.minimumRadiusRs = this.geodesic.diagnostics.minimumRadius;
    target.maximumRadiusRs = this.geodesic.diagnostics.maximumRadius;
    const circularRadius = this.configuration.preset === "circular" ? this.configuration.radius : Number.NaN;
    target.periapsisRadiusRs = Number.isFinite(this.configuration.periapsisRadius) ? this.configuration.periapsisRadius : circularRadius;
    target.apocenterRadiusRs = Number.isFinite(this.configuration.apocenterRadius) ? this.configuration.apocenterRadius : circularRadius;
    target.renderX = this.particle.position.x;
    target.renderY = this.particle.position.y;
    target.renderZ = this.particle.position.z;
  }

  #syncParticle(appendTrail) {
    const values = this.geodesic.state.values;
    const radius = values[GeodesicStateIndex.RADIUS];
    const phi = values[GeodesicStateIndex.PHI];
    const radialVelocity = values[GeodesicStateIndex.RADIAL_VELOCITY];
    const angularVelocityRadius = this.geodesic.state.angularMomentum / radius;
    this.geodesic.writeRenderPosition(this.particle.position, this.renderScale);
    this.particle.velocity.set(
      radialVelocity * Math.cos(phi) - angularVelocityRadius * Math.sin(phi),
      0,
      radialVelocity * Math.sin(phi) + angularVelocityRadius * Math.cos(phi),
    );
    this.particle.properTime = this.geodesic.properTimeSI();
    this.particle.coordinateTime = this.geodesic.coordinateTimeSI();
    this.particle.energy = this.geodesic.state.energy;
    this.particle.angularMomentum.set(0, this.geodesic.state.angularMomentum, 0);
    if (this.geodesic.status === GeodesicStatus.CAPTURED) this.particle.state = ParticleState.CAPTURED;
    else if (this.geodesic.status === GeodesicStatus.OUT_OF_DOMAIN) this.particle.state = ParticleState.OUT_OF_DOMAIN;
    else if (this.geodesic.state.energy >= 1) this.particle.state = ParticleState.ESCAPING;
    else this.particle.state = ParticleState.ORBITING;
    if (appendTrail && this.geodesic.status === GeodesicStatus.ACTIVE) {
      this.particle.trail.pushIfSeparated(this.particle.position, MINIMUM_TRAIL_DISPLACEMENT_SQUARED);
    }
    this.particles.touch();
  }
}
