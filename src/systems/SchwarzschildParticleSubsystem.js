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

const DEFAULT_RENDER_SCALE = 2.4;

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

  apply(configuration) {
    const next = { ...this.configuration, ...configuration };
    const units = new SchwarzschildUnits(solarMassesToKilograms(next.massSolar));
    const geodesic = new SchwarzschildGeodesicSystem({ units, maximumSubsteps: next.maximumSubsteps });
    geodesic.initialize(createInitialCondition(next));

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
    target.energy = this.geodesic.state.energy;
    target.angularMomentum = this.geodesic.state.angularMomentum;
    target.angularMomentumSI = this.units.normalizedSpecificAngularMomentumToSI(this.geodesic.state.angularMomentum);
    target.energyDrift = this.geodesic.diagnostics.relativeEnergyDrift;
    target.angularMomentumDrift = this.geodesic.diagnostics.relativeAngularMomentumDrift;
    target.normalizationResidual = this.geodesic.diagnostics.normalizationResidual;
    target.integrationSubsteps = this.geodesic.diagnostics.substeps;
    target.minimumRadiusRs = this.geodesic.diagnostics.minimumRadius;
    target.maximumRadiusRs = this.geodesic.diagnostics.maximumRadius;
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
    if (appendTrail && this.geodesic.status === GeodesicStatus.ACTIVE) this.particle.trail.push(this.particle.position);
    this.particles.touch();
  }
}
