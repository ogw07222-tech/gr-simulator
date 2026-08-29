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

export class PhotonSubsystem {
  constructor({ enabled = false, massSolar = 4e6, maximumRadius = 60, maximumAffineStep = 0.02 } = {}) {
    this.order = 70;
    this.enabled = Boolean(enabled);
    this.maximumRadius = maximumRadius;
    this.maximumAffineStep = maximumAffineStep;
    this.configuration = { preset: "weak", massSolar, ...PHOTON_PRESETS.weak };
    this.position = { x: 0, y: 0, z: 0 };
    this.work = { integrationPasses: 0, trajectoryUpdates: 0, trailUpdates: 0, diagnosticUpdates: 0, renderBufferUpdates: 0 };
    this.apply(this.configuration);
  }

  setEnabled(enabled) { this.enabled = Boolean(enabled); return this.enabled; }

  setMassSolar(massSolar) {
    if (!(massSolar > 0) || !Number.isFinite(massSolar)) throw new RangeError("Photon central mass must be positive and finite.");
    return this.apply({ ...this.configuration, massSolar });
  }

  applyPreset(key) {
    const preset = photonPreset(key);
    return this.apply({ ...preset, preset: key, massSolar: this.configuration.massSolar });
  }

  apply(configuration) {
    const next = { ...this.configuration, ...configuration };
    const initial = createPhotonInitialCondition(next);
    const units = new SchwarzschildUnits(solarMassesToKilograms(next.massSolar));
    const maximumRadius = Math.max(this.maximumRadius, next.radius * 1.25);
    const geodesic = new SchwarzschildNullGeodesicSystem({ units, maximumRadius, maximumAffineStep: this.maximumAffineStep });
    geodesic.initialize(initial);
    this.configuration = next;
    this.units = units;
    this.geodesic = geodesic;
    this.initialDeflectionState = new Float64Array(geodesic.state.values);
    this.deflectionMeasurement = {
      incomingDirection: { x: 0, z: 0 },
      outgoingDirection: { x: Number.NaN, z: Number.NaN },
      incomingHeading: nullSpatialHeading(this.initialDeflectionState, geodesic.state.angularMomentum),
      outgoingHeading: Number.NaN,
      deflectionAngleRadians: Number.NaN,
    };
    writeNullSpatialDirection(
      this.initialDeflectionState,
      geodesic.state.angularMomentum,
      this.deflectionMeasurement.incomingDirection,
    );
    this.#syncPosition();
    return this;
  }

  reset() { return this.apply(this.configuration); }

  update(deltaSeconds) {
    if (!this.enabled || this.geodesic.status !== PhotonStatus.ACTIVE) return 0;
    if (!(deltaSeconds >= 0) || !Number.isFinite(deltaSeconds)) throw new RangeError("Photon update delta must be finite and non-negative.");
    if (deltaSeconds === 0) return 0;
    const deltaAffine = this.units.siTimeToNormalized(deltaSeconds);
    const previousStatus = this.geodesic.status;
    const completed = this.geodesic.advanceAffine(deltaAffine);
    if (previousStatus === PhotonStatus.ACTIVE && this.geodesic.status === PhotonStatus.ESCAPED) {
      writePhotonDeflectionMeasurement(
        this.initialDeflectionState,
        this.geodesic.state.values,
        this.geodesic.state.angularMomentum,
        this.deflectionMeasurement,
      );
    }
    this.work.integrationPasses += 1;
    this.work.diagnosticUpdates += 1;
    if (completed > 0 || this.geodesic.status !== PhotonStatus.ACTIVE) {
      this.#syncPosition();
      this.work.trajectoryUpdates += 1;
    }
    return completed;
  }

  render() {
    if (!this.enabled) return 0;
    return 0;
  }

  writeSnapshot(target = {}) {
    const values = this.geodesic.state.values;
    target.id = "photon-0";
    target.physicsModel = "Schwarzschild null geodesic";
    target.status = this.geodesic.status;
    target.radiusRs = values[NullGeodesicStateIndex.RADIUS];
    target.radiusMetres = this.units.normalizedRadiusToSI(target.radiusRs);
    target.impactParameterRs = this.geodesic.impactParameterRs();
    target.affineParameter = values[NullGeodesicStateIndex.AFFINE_PARAMETER];
    target.coordinateTime = this.geodesic.coordinateTimeSI();
    target.energy = this.geodesic.state.energy;
    target.angularMomentum = this.geodesic.state.angularMomentum;
    target.radialDirection = Math.sign(values[NullGeodesicStateIndex.RADIAL_VELOCITY]) || 0;
    target.nullConditionError = this.geodesic.diagnostics.lastRelativeNullError;
    target.integrationSubsteps = this.geodesic.diagnostics.substeps;
    target.incomingAsymptoticDirectionX = this.deflectionMeasurement.incomingDirection.x;
    target.incomingAsymptoticDirectionZ = this.deflectionMeasurement.incomingDirection.z;
    target.outgoingAsymptoticDirectionX = this.deflectionMeasurement.outgoingDirection.x;
    target.outgoingAsymptoticDirectionZ = this.deflectionMeasurement.outgoingDirection.z;
    target.deflectionAngleRadians = this.deflectionMeasurement.deflectionAngleRadians;
    target.x = this.position.x; target.y = this.position.y; target.z = this.position.z;
    return target;
  }

  resetWorkCounters() { for (const key of Object.keys(this.work)) this.work[key] = 0; }
  getDiagnostics() {
    return {
      enabled: this.enabled,
      ...this.work,
      status: this.geodesic.status,
      affineParameter: this.geodesic.affineParameter(),
      deflectionAngleRadians: this.deflectionMeasurement.deflectionAngleRadians,
    };
  }

  #syncPosition() { this.geodesic.writeRenderPosition(this.position, 1); }
}
