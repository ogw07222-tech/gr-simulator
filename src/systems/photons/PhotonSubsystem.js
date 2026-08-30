import {
  NullGeodesicStateIndex,
  PhotonStatus,
  PHOTON_PRESETS,
  SchwarzschildNullGeodesicSystem,
  SchwarzschildUnits,
  createPhotonInitialCondition,
  nullSpatialHeading,
  photonPreset,
  solarMassesToKilograms,
  writeNullSpatialDirection,
  writePhotonDeflectionMeasurement,
} from "../../physics/index.js";
import { PhotonTrail } from "./PhotonTrail.js";

export const PHOTON_COUNTS = Object.freeze([1, 8, 32, 64]);
export const MAX_PHOTON_COUNT = 64;
export const LIGHT_BENDING_IMPACT_PARAMETERS_RS = Object.freeze([2.2, 2.45, 2.62, 2.8, 3.2, 4, 5, 6]);
export const LIGHT_BENDING_START_X_RS = 40;

function createDeflectionMeasurement(initialState, angularMomentum) {
  const measurement = {
    incomingDirection: { x: 0, z: 0 },
    outgoingDirection: { x: Number.NaN, z: Number.NaN },
    incomingHeading: nullSpatialHeading(initialState, angularMomentum),
    outgoingHeading: Number.NaN,
    deflectionAngleRadians: Number.NaN,
  };
  writeNullSpatialDirection(initialState, angularMomentum, measurement.incomingDirection);
  return measurement;
}

function createLightBendingConfiguration(impactParameter, massSolar) {
  const x = -LIGHT_BENDING_START_X_RS;
  const z = -impactParameter;
  return {
    preset: "lightBending",
    name: "Light Bending",
    massSolar,
    radius: Math.hypot(x, z),
    phi: Math.atan2(z, x),
    impactParameter,
    radialDirection: -1,
    angularDirection: 1,
    energy: 1,
  };
}

export class PhotonSubsystem {
  constructor({
    enabled = false,
    massSolar = 4e6,
    maximumRadius = 60,
    maximumAffineStep = 0.02,
    maxTrailLength = 128,
    photonCount = 1,
    renderer = null,
  } = {}) {
    this.order = 70;
    this.enabled = Boolean(enabled);
    this.maximumRadius = maximumRadius;
    this.maximumAffineStep = maximumAffineStep;
    this.maxTrailLength = maxTrailLength;
    this.renderer = renderer;
    this.configuration = { preset: "weak", massSolar, ...PHOTON_PRESETS.weak };
    this.photonCount = this.#validatedCount(photonCount);
    this.rayConfigurations = null;
    this.rays = [];
    this.revisionCounter = 0;
    this.work = {
      integrationPasses: 0,
      trajectoryUpdates: 0,
      trailUpdates: 0,
      diagnosticUpdates: 0,
      renderBufferUpdates: 0,
    };
    this.#rebuildRays();
    this.renderer?.setEnabled(this.enabled);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.renderer?.setEnabled(this.enabled);
    return this.enabled;
  }

  setCount(count) {
    const next = this.#validatedCount(count);
    if (next === this.photonCount && this.rayConfigurations === null) return this.photonCount;
    this.photonCount = next;
    this.rayConfigurations = null;
    this.#rebuildRays();
    return this.photonCount;
  }

  setMassSolar(massSolar) {
    if (!(massSolar > 0) || !Number.isFinite(massSolar)) {
      throw new RangeError("Photon central mass must be positive and finite.");
    }
    return this.apply({ ...this.configuration, massSolar });
  }

  applyPreset(key) {
    const preset = photonPreset(key);
    return this.apply({ ...preset, preset: key, massSolar: this.configuration.massSolar });
  }

  apply(configuration) {
    this.configuration = { ...this.configuration, ...configuration };
    this.rayConfigurations = null;
    this.#rebuildRays();
    return this;
  }

  applyLightBendingDemo() {
    const massSolar = this.configuration.massSolar;
    this.photonCount = 8;
    this.rayConfigurations = LIGHT_BENDING_IMPACT_PARAMETERS_RS.map((impactParameter) => (
      createLightBendingConfiguration(impactParameter, massSolar)
    ));
    this.configuration = { ...this.rayConfigurations[0] };
    this.#rebuildRays();
    return this;
  }

  reset() {
    this.#rebuildRays();
    return this;
  }

  update(deltaSeconds) {
    if (!this.enabled) return 0;
    if (!(deltaSeconds >= 0) || !Number.isFinite(deltaSeconds)) {
      throw new RangeError("Photon update delta must be finite and non-negative.");
    }
    if (deltaSeconds === 0) return 0;

    const deltaAffine = this.units.siTimeToNormalized(deltaSeconds);
    let completedTotal = 0;
    let changed = false;
    for (let index = 0; index < this.photonCount; index += 1) {
      const ray = this.rays[index];
      if (ray.geodesic.status !== PhotonStatus.ACTIVE) continue;
      const previousStatus = ray.geodesic.status;
      const completed = ray.geodesic.advanceAffine(deltaAffine);
      this.work.integrationPasses += 1;
      this.work.diagnosticUpdates += 1;
      completedTotal += completed;

      if (previousStatus === PhotonStatus.ACTIVE && ray.geodesic.status === PhotonStatus.ESCAPED) {
        writePhotonDeflectionMeasurement(
          ray.initialDeflectionState,
          ray.geodesic.state.values,
          ray.geodesic.state.angularMomentum,
          ray.deflectionMeasurement,
        );
      }
      if (completed > 0 || ray.geodesic.status !== previousStatus) {
        ray.geodesic.writeRenderPosition(ray.position, 1);
        this.work.trajectoryUpdates += 1;
        if (completed > 0) {
          ray.trail.append(ray.position.x, ray.position.y, ray.position.z);
          this.work.trailUpdates += 1;
        }
        changed = true;
      }
    }
    if (changed) this.revisionCounter += 1;
    return completedTotal;
  }

  render() {
    if (!this.enabled || !this.renderer) return 0;
    if (!this.renderer.sync(this)) return 0;
    this.work.renderBufferUpdates += 1;
    return 1;
  }

  writeSnapshot(target = {}) { return this.writeSnapshotAt(0, target); }

  writeSnapshotAt(index, target = {}) {
    const ray = this.rays[index];
    if (!ray) return null;
    const values = ray.geodesic.state.values;
    target.id = ray.id;
    target.physicsModel = "Schwarzschild null geodesic";
    target.status = ray.geodesic.status;
    target.radiusRs = values[NullGeodesicStateIndex.RADIUS];
    target.radiusMetres = this.units.normalizedRadiusToSI(target.radiusRs);
    target.impactParameterRs = ray.geodesic.impactParameterRs();
    target.affineParameter = values[NullGeodesicStateIndex.AFFINE_PARAMETER];
    target.coordinateTime = ray.geodesic.coordinateTimeSI();
    target.energy = ray.geodesic.state.energy;
    target.angularMomentum = ray.geodesic.state.angularMomentum;
    target.radialDirection = Math.sign(values[NullGeodesicStateIndex.RADIAL_VELOCITY]) || 0;
    target.nullConditionAbsoluteError = Math.abs(ray.geodesic.diagnostics.lastNullResidual);
    target.nullConditionRelativeError = ray.geodesic.diagnostics.lastRelativeNullError;
    target.nullConditionError = target.nullConditionRelativeError;
    target.integrationSubsteps = ray.geodesic.diagnostics.substeps;
    target.incomingAsymptoticDirectionX = ray.deflectionMeasurement.incomingDirection.x;
    target.incomingAsymptoticDirectionZ = ray.deflectionMeasurement.incomingDirection.z;
    target.outgoingAsymptoticDirectionX = ray.deflectionMeasurement.outgoingDirection.x;
    target.outgoingAsymptoticDirectionZ = ray.deflectionMeasurement.outgoingDirection.z;
    target.deflectionAngleRadians = ray.deflectionMeasurement.deflectionAngleRadians;
    target.x = ray.position.x;
    target.y = ray.position.y;
    target.z = ray.position.z;
    return target;
  }

  count() { return this.photonCount; }
  idAt(index) { return this.rays[index]?.id ?? null; }
  positionAt(index) { return this.rays[index]?.position ?? null; }
  trailAt(index) { return this.rays[index]?.trail ?? null; }
  geodesicAt(index) { return this.rays[index]?.geodesic ?? null; }
  revision() { return this.revisionCounter; }

  resetWorkCounters() {
    for (const key of Object.keys(this.work)) this.work[key] = 0;
  }

  getDiagnostics() {
    let active = 0;
    let captured = 0;
    let escaped = 0;
    let failures = 0;
    for (let index = 0; index < this.photonCount; index += 1) {
      const status = this.rays[index].geodesic.status;
      if (status === PhotonStatus.ACTIVE) active += 1;
      else if (status === PhotonStatus.CAPTURED) captured += 1;
      else if (status === PhotonStatus.ESCAPED) escaped += 1;
      else failures += 1;
    }
    return {
      enabled: this.enabled,
      count: this.photonCount,
      preset: this.configuration.preset,
      active,
      captured,
      escaped,
      numericalFailures: failures,
      ...this.work,
      status: this.geodesic.status,
      affineParameter: this.geodesic.affineParameter(),
      deflectionAngleRadians: this.deflectionMeasurement.deflectionAngleRadians,
      trailSamples: this.trail.count,
      trailCapacity: this.trail.maxLength,
    };
  }

  #validatedCount(count) {
    if (!PHOTON_COUNTS.includes(count)) throw new RangeError("Photon count must be one of 1, 8, 32, or 64.");
    return count;
  }

  #createRay(index) {
    const configuration = this.rayConfigurations?.[index] ?? this.configuration;
    const initial = createPhotonInitialCondition(configuration);
    const maximumRadius = Math.max(this.maximumRadius, configuration.radius * 1.25);
    const geodesic = new SchwarzschildNullGeodesicSystem({
      units: this.units,
      maximumRadius,
      maximumAffineStep: this.maximumAffineStep,
    });
    geodesic.initialize(initial);
    const position = { x: 0, y: 0, z: 0 };
    geodesic.writeRenderPosition(position, 1);
    const trail = new PhotonTrail(this.maxTrailLength);
    trail.append(position.x, position.y, position.z);
    const initialDeflectionState = new Float64Array(geodesic.state.values);
    return {
      id: `photon-${index}`,
      geodesic,
      position,
      trail,
      initialDeflectionState,
      deflectionMeasurement: createDeflectionMeasurement(initialDeflectionState, geodesic.state.angularMomentum),
    };
  }

  #rebuildRays() {
    this.units = new SchwarzschildUnits(solarMassesToKilograms(this.configuration.massSolar));
    this.rays = new Array(this.photonCount);
    for (let index = 0; index < this.photonCount; index += 1) this.rays[index] = this.#createRay(index);
    const first = this.rays[0];
    this.geodesic = first.geodesic;
    this.position = first.position;
    this.trail = first.trail;
    this.initialDeflectionState = first.initialDeflectionState;
    this.deflectionMeasurement = first.deflectionMeasurement;
    this.revisionCounter += 1;
  }
}
