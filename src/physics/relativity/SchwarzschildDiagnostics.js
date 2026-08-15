import { effectivePotential } from "./SchwarzschildConstantsOfMotion.js";
import { SchwarzschildMetric } from "./SchwarzschildMetric.js";
import { GeodesicStateIndex as I } from "./SchwarzschildGeodesicState.js";

const RADIAL_DIRECTION_EPSILON = 1e-10;

export class SchwarzschildDiagnostics {
  constructor() {
    this.initialEnergy = 0; this.currentEnergy = 0; this.relativeEnergyDrift = 0;
    this.initialAngularMomentum = 0; this.currentAngularMomentum = 0; this.relativeAngularMomentumDrift = 0;
    this.normalizationResidual = 0; this.substeps = 0; this.rejectedSubsteps = 0;
    this.minimumRadius = Infinity; this.maximumRadius = 0;
    this.radialPeriods = 0; this.lastRadialDirection = 0;
    this.lastPeriapsisPhi = NaN; this.lastRadialPeriodAngle = 0; this.periapsisAdvance = 0;
  }

  reset(state) {
    this.initialEnergy = state.energy;
    this.initialAngularMomentum = state.angularMomentum;
    this.substeps = 0; this.rejectedSubsteps = 0;
    this.minimumRadius = state.values[I.RADIUS]; this.maximumRadius = state.values[I.RADIUS];
    const radialVelocity = state.values[I.RADIAL_VELOCITY];
    this.radialPeriods = 0;
    this.lastRadialDirection = radialVelocity > RADIAL_DIRECTION_EPSILON
      ? 1 : radialVelocity < -RADIAL_DIRECTION_EPSILON ? -1 : 0;
    this.lastPeriapsisPhi = NaN; this.lastRadialPeriodAngle = 0; this.periapsisAdvance = 0;
    this.update(state);
  }

  update(state) {
    const r = state.values[I.RADIUS];
    const ur = state.values[I.RADIAL_VELOCITY];
    const f = SchwarzschildMetric.lapseSquared(r);
    this.currentEnergy = Math.sqrt(Math.max(0, ur * ur + effectivePotential(r, state.angularMomentum)));
    this.currentAngularMomentum = state.angularMomentum;
    this.relativeEnergyDrift = Math.abs(this.currentEnergy - this.initialEnergy) / Math.max(Math.abs(this.initialEnergy), Number.EPSILON);
    this.relativeAngularMomentumDrift = Math.abs(this.currentAngularMomentum - this.initialAngularMomentum) / Math.max(Math.abs(this.initialAngularMomentum), Number.EPSILON);
    this.normalizationResidual = f > 0
      ? -(state.energy ** 2) / f + ur * ur / f + state.angularMomentum ** 2 / (r * r) + 1
      : Infinity;
    this.minimumRadius = Math.min(this.minimumRadius, r);
    this.maximumRadius = Math.max(this.maximumRadius, r);
    const direction = ur > RADIAL_DIRECTION_EPSILON ? 1 : ur < -RADIAL_DIRECTION_EPSILON ? -1 : 0;
    if (direction !== 0) {
      if (this.lastRadialDirection === -1 && direction === 1) {
        const phi = state.values[I.PHI];
        if (Number.isFinite(this.lastPeriapsisPhi)) {
          this.lastRadialPeriodAngle = phi - this.lastPeriapsisPhi;
          this.periapsisAdvance = this.lastRadialPeriodAngle - 2 * Math.PI;
          this.radialPeriods += 1;
        }
        this.lastPeriapsisPhi = phi;
      }
      this.lastRadialDirection = direction;
    }
  }
}
