import { PhotonStatus } from "./PhotonStatus.js";
import { NullGeodesicStateIndex as I, SchwarzschildNullGeodesicState } from "./SchwarzschildNullGeodesicState.js";
import { SchwarzschildMetric } from "./SchwarzschildMetric.js";

export function nullRadialVelocity(radius, energy, angularMomentum, direction = -1) {
  if (!(radius > 1) || !Number.isFinite(radius)) throw new RangeError("Null geodesics require r > r_s.");
  if (!(energy > 0) || !Number.isFinite(energy) || !Number.isFinite(angularMomentum)) {
    throw new RangeError("Null-geodesic constants must be finite with E > 0.");
  }
  const f = SchwarzschildMetric.lapseSquared(radius);
  const radialSquared = energy * energy - f * angularMomentum * angularMomentum / (radius * radius);
  if (radialSquared < -1e-14) throw new RangeError("The requested constants do not permit a real null radial velocity at this radius.");
  const magnitude = Math.sqrt(Math.max(0, radialSquared));
  return direction >= 0 ? magnitude : -magnitude;
}

export class SchwarzschildNullGeodesicSystem {
  constructor({ units, maximumRadius = 100, captureRadius = 1.0005, maximumAffineStep = 0.02, maximumSubsteps = 4096 } = {}) {
    if (!units) throw new TypeError("SchwarzschildNullGeodesicSystem requires a Schwarzschild unit system.");
    this.units = units;
    this.maximumRadius = maximumRadius;
    this.captureRadius = captureRadius;
    this.maximumAffineStep = maximumAffineStep;
    this.maximumSubsteps = maximumSubsteps;
    this.state = new SchwarzschildNullGeodesicState();
    this.status = PhotonStatus.NUMERICAL_FAILURE;
    this.diagnostics = {
      substeps: 0,
      lastNullResidual: Number.NaN,
      lastRelativeNullError: Number.NaN,
      maximumAbsoluteNullResidual: 0,
      maximumRelativeNullError: 0,
    };
    this.k1 = new Float64Array(5); this.k2 = new Float64Array(5);
    this.k3 = new Float64Array(5); this.k4 = new Float64Array(5);
    this.work = new Float64Array(5); this.candidate = new Float64Array(5);
  }

  initialize(initial) {
    if (!initial || !(initial.radius > this.captureRadius) || initial.radius >= this.maximumRadius
      || !(initial.energy > 0) || !Number.isFinite(initial.energy)
      || !Number.isFinite(initial.angularMomentum) || !Number.isFinite(initial.radialVelocity)
      || !Number.isFinite(initial.phi ?? 0) || !Number.isFinite(initial.time ?? 0)
      || !Number.isFinite(initial.affineParameter ?? 0)) {
      throw new RangeError("Invalid Schwarzschild null-geodesic initial condition.");
    }
    this.state.set(initial);
    this.status = PhotonStatus.ACTIVE;
    this.diagnostics.substeps = 0;
    this.diagnostics.maximumAbsoluteNullResidual = 0;
    this.diagnostics.maximumRelativeNullError = 0;
    this.#updateNullDiagnostics(this.state.values);
    return this;
  }

  advanceAffine(deltaLambda) {
    if (this.status !== PhotonStatus.ACTIVE || deltaLambda === 0) return 0;
    if (!(deltaLambda > 0) || !Number.isFinite(deltaLambda)) throw new RangeError("Affine-parameter advance must be positive and finite.");
    const substeps = Math.ceil(deltaLambda / this.maximumAffineStep);
    if (substeps > this.maximumSubsteps) {
      this.status = PhotonStatus.NUMERICAL_FAILURE;
      return 0;
    }
    const step = deltaLambda / substeps;
    let completed = 0;
    for (let index = 0; index < substeps; index += 1) {
      const radius = this.state.values[I.RADIUS];
      const radialVelocity = this.state.values[I.RADIAL_VELOCITY];
      if (radialVelocity < 0 && radius + radialVelocity * step <= this.captureRadius) {
        this.status = PhotonStatus.CAPTURED;
        break;
      }
      this.#rk4(step);
      if (!this.#candidateFinite()) {
        this.status = PhotonStatus.NUMERICAL_FAILURE;
        break;
      }
      const candidateRadius = this.candidate[I.RADIUS];
      if (candidateRadius <= this.captureRadius) {
        this.status = PhotonStatus.CAPTURED;
        break;
      }
      this.state.values.set(this.candidate);
      completed += 1;
      this.diagnostics.substeps += 1;
      this.#updateNullDiagnostics(this.state.values);
      if (candidateRadius >= this.maximumRadius && this.state.values[I.RADIAL_VELOCITY] > 0) {
        this.status = PhotonStatus.ESCAPED;
        break;
      }
    }
    return completed;
  }

  nullCondition(values = this.state.values) {
    const radius = values[I.RADIUS];
    const f = SchwarzschildMetric.lapseSquared(radius);
    if (!(f > 0)) return { residual: Number.NaN, relativeError: Number.NaN };
    const kt = this.state.energy / f;
    const kr = values[I.RADIAL_VELOCITY];
    const kphi = this.state.angularMomentum / (radius * radius);
    const timeTerm = -f * kt * kt;
    const radialTerm = kr * kr / f;
    const angularTerm = radius * radius * kphi * kphi;
    const residual = timeTerm + radialTerm + angularTerm;
    const scale = Math.abs(timeTerm) + Math.abs(radialTerm) + Math.abs(angularTerm);
    return { residual, relativeError: scale > 0 ? Math.abs(residual) / scale : 0 };
  }

  writeRenderPosition(target, scale = 1) {
    const radius = this.state.values[I.RADIUS] * scale;
    const phi = this.state.values[I.PHI];
    target.x = radius * Math.cos(phi);
    target.y = 0;
    target.z = radius * Math.sin(phi);
    return target;
  }

  coordinateTimeSI() { return this.units.normalizedTimeToSI(this.state.values[I.TIME]); }
  affineParameter() { return this.state.values[I.AFFINE_PARAMETER]; }
  impactParameterRs() { return this.state.angularMomentum / this.state.energy; }

  #derivative(values, output) {
    const radius = values[I.RADIUS];
    const f = SchwarzschildMetric.lapseSquared(radius);
    const angularMomentum = this.state.angularMomentum;
    output[I.TIME] = this.state.energy / f;
    output[I.RADIUS] = values[I.RADIAL_VELOCITY];
    output[I.PHI] = angularMomentum / (radius * radius);
    output[I.RADIAL_VELOCITY] = angularMomentum * angularMomentum * (1 / (radius ** 3) - 1.5 / (radius ** 4));
    output[I.AFFINE_PARAMETER] = 1;
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
    for (let i = 0; i < this.candidate.length; i += 1) if (!Number.isFinite(this.candidate[i])) return false;
    return true;
  }

  #updateNullDiagnostics(values) {
    const { residual, relativeError } = this.nullCondition(values);
    this.diagnostics.lastNullResidual = residual;
    this.diagnostics.lastRelativeNullError = relativeError;
    if (Number.isFinite(residual)) this.diagnostics.maximumAbsoluteNullResidual = Math.max(this.diagnostics.maximumAbsoluteNullResidual, Math.abs(residual));
    if (Number.isFinite(relativeError)) this.diagnostics.maximumRelativeNullError = Math.max(this.diagnostics.maximumRelativeNullError, relativeError);
  }
}
