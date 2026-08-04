import { radialAcceleration } from "./SchwarzschildConstantsOfMotion.js";
import { GeodesicStatus } from "./GeodesicStatus.js";
import { GeodesicStateIndex as I } from "./SchwarzschildGeodesicState.js";

export const OrbitClassification = Object.freeze({
  STABLE_CIRCULAR: "StableCircular", UNSTABLE_CIRCULAR: "UnstableCircular",
  BOUND_NON_CIRCULAR: "BoundNonCircular", PLUNGING_CAPTURED: "PlungingCaptured",
  UNBOUND_SCATTERING: "UnboundScattering", OUT_OF_DOMAIN: "OutOfDomain",
  NUMERICAL_FAILURE: "NumericalFailure", INDETERMINATE: "Indeterminate",
});

export function classifyOrbit(state, status) {
  if (status === GeodesicStatus.CAPTURED) return OrbitClassification.PLUNGING_CAPTURED;
  if (status === GeodesicStatus.OUT_OF_DOMAIN) return OrbitClassification.OUT_OF_DOMAIN;
  if (status === GeodesicStatus.NUMERICAL_FAILURE) return OrbitClassification.NUMERICAL_FAILURE;
  const r = state.values[I.RADIUS];
  const ur = state.values[I.RADIAL_VELOCITY];
  if (Math.abs(ur) < 1e-9 && Math.abs(radialAcceleration(r, state.angularMomentum)) < 1e-9) {
    return r >= 3 ? OrbitClassification.STABLE_CIRCULAR : OrbitClassification.UNSTABLE_CIRCULAR;
  }
  if (state.energy < 1) return OrbitClassification.BOUND_NON_CIRCULAR;
  if (state.energy >= 1 && ur > 0) return OrbitClassification.UNBOUND_SCATTERING;
  return OrbitClassification.INDETERMINATE;
}
