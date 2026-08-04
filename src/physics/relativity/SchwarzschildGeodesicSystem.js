import { radialAcceleration } from "./SchwarzschildConstantsOfMotion.js";
import { SchwarzschildDiagnostics } from "./SchwarzschildDiagnostics.js";
import { GeodesicStatus } from "./GeodesicStatus.js";
import { GeodesicStateIndex as I, SchwarzschildGeodesicState } from "./SchwarzschildGeodesicState.js";
import { SchwarzschildMetric } from "./SchwarzschildMetric.js";
import { classifyOrbit } from "./SchwarzschildOrbitClassifier.js";

export class SchwarzschildGeodesicSystem {
  constructor({ units, maximumRadius = 10, captureRadius = 1.001, maximumNormalizedStep = 0.02, maximumSubsteps = 128 } = {}) {
    if (!units) throw new TypeError("SchwarzschildGeodesicSystem requires a unit system.");
    this.units = units;
    this.maximumRadius = maximumRadius;
    this.captureRadius = captureRadius;
    this.maximumNormalizedStep = maximumNormalizedStep;
    this.maximumSubsteps = maximumSubsteps;
    this.state = new SchwarzschildGeodesicState();
    this.diagnostics = new SchwarzschildDiagnostics();
    this.status = GeodesicStatus.INVALID_INITIAL_CONDITION;
    this.classification = "Indeterminate";
    this.k1 = new Float64Array(5); this.k2 = new Float64Array(5);
    this.k3 = new Float64Array(5); this.k4 = new Float64Array(5);
    this.work = new Float64Array(5); this.candidate = new Float64Array(5);
  }

  initialize(initial) {
    if (!initial || !(initial.radius > this.captureRadius) || initial.radius > this.maximumRadius
      || !(initial.energy > 0) || !Number.isFinite(initial.energy)
      || !Number.isFinite(initial.angularMomentum) || !Number.isFinite(initial.radialVelocity)
      || !Number.isFinite(initial.phi ?? 0)) {
      this.status = GeodesicStatus.INVALID_INITIAL_CONDITION;
      throw new RangeError("Initial radius is outside the supported Schwarzschild domain.");
    }
    this.state.set(initial);
    this.status = GeodesicStatus.ACTIVE;
    this.diagnostics.reset(this.state);
    this.classification = classifyOrbit(this.state, this.status);
    return this;
  }

  advanceProperTimeSI(deltaSeconds) {
    if (this.status !== GeodesicStatus.ACTIVE || deltaSeconds === 0) return 0;
    if (!(deltaSeconds > 0) || !Number.isFinite(deltaSeconds)) throw new RangeError("Integration time must be positive and finite.");
    const normalizedDelta = this.units.siTimeToNormalized(deltaSeconds);
    const substeps = Math.ceil(normalizedDelta / this.maximumNormalizedStep);
    if (substeps > this.maximumSubsteps) {
      this.status = GeodesicStatus.NUMERICAL_FAILURE;
      this.classification = classifyOrbit(this.state, this.status);
      return 0;
    }
    const step = normalizedDelta / substeps;
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
    this.classification = classifyOrbit(this.state, this.status);
    return this.diagnostics.substeps;
  }

  writeRenderPosition(target, scale = 6) {
    const radius = this.state.values[I.RADIUS] * scale;
    const phi = this.state.values[I.PHI];
    target.x = radius * Math.cos(phi);
    target.y = 0;
    target.z = radius * Math.sin(phi);
    return target;
  }

  coordinateTimeSI() { return this.units.normalizedTimeToSI(this.state.values[I.TIME]); }
  properTimeSI() { return this.units.normalizedTimeToSI(this.state.values[I.PROPER_TIME]); }

  #derivative(values, output) {
    const radius = values[I.RADIUS];
    const f = SchwarzschildMetric.lapseSquared(radius);
    output[I.TIME] = this.state.energy / f;
    output[I.RADIUS] = values[I.RADIAL_VELOCITY];
    output[I.PHI] = this.state.angularMomentum / (radius * radius);
    output[I.RADIAL_VELOCITY] = radialAcceleration(radius, this.state.angularMomentum);
    output[I.PROPER_TIME] = 1;
  }

  #rk4(step) {
    const values = this.state.values;
    this.#derivative(values, this.k1);
    for (let i = 0; i < 5; i += 1) this.work[i] = values[i] + 0.5 * step * this.k1[i];
    this.#derivative(this.work, this.k2);
    for (let i = 0; i < 5; i += 1) this.work[i] = values[i] + 0.5 * step * this.k2[i];
    this.#derivative(this.work, this.k3);
    for (let i = 0; i < 5; i += 1) this.work[i] = values[i] + step * this.k3[i];
    this.#derivative(this.work, this.k4);
    for (let i = 0; i < 5; i += 1) {
      this.candidate[i] = values[i] + step * (this.k1[i] + 2 * this.k2[i] + 2 * this.k3[i] + this.k4[i]) / 6;
    }
  }

  #candidateFinite() {
    for (let index = 0; index < this.candidate.length; index += 1) {
      if (!Number.isFinite(this.candidate[index])) return false;
    }
    return true;
  }
}
