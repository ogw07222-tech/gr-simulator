import { effectivePotential } from "./SchwarzschildConstantsOfMotion.js";
import { SchwarzschildMetric } from "./SchwarzschildMetric.js";
import { GeodesicStateIndex as I } from "./SchwarzschildGeodesicState.js";

export class SchwarzschildDiagnostics {
  constructor() {
    this.initialEnergy = 0; this.currentEnergy = 0; this.relativeEnergyDrift = 0;
    this.initialAngularMomentum = 0; this.currentAngularMomentum = 0; this.relativeAngularMomentumDrift = 0;
    this.normalizationResidual = 0; this.substeps = 0; this.rejectedSubsteps = 0;
    this.minimumRadius = Infinity; this.maximumRadius = 0;
  }

  reset(state) {
    this.initialEnergy = state.energy;
    this.initialAngularMomentum = state.angularMomentum;
    this.substeps = 0; this.rejectedSubsteps = 0;
    this.minimumRadius = state.values[I.RADIUS]; this.maximumRadius = state.values[I.RADIUS];
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
  }
}
