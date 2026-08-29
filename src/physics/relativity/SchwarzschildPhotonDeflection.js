import { NullGeodesicStateIndex as I } from "./SchwarzschildNullGeodesicState.js";

export function writeNullSpatialDirection(values, angularMomentum, target) {
  const radius = values[I.RADIUS];
  const phi = values[I.PHI];
  const radial = values[I.RADIAL_VELOCITY];
  const tangential = angularMomentum / radius;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = radial * cosPhi - tangential * sinPhi;
  const dz = radial * sinPhi + tangential * cosPhi;
  const magnitude = Math.hypot(dx, dz);
  target.x = magnitude > 0 ? dx / magnitude : 0;
  target.z = magnitude > 0 ? dz / magnitude : 0;
  return target;
}

export function nullSpatialHeading(values, angularMomentum) {
  return values[I.PHI] + Math.atan2(
    angularMomentum / values[I.RADIUS],
    values[I.RADIAL_VELOCITY],
  );
}

export function writePhotonDeflectionMeasurement(initialValues, finalValues, angularMomentum, target) {
  const incoming = target.incomingDirection ?? (target.incomingDirection = { x: 0, z: 0 });
  const outgoing = target.outgoingDirection ?? (target.outgoingDirection = { x: 0, z: 0 });
  writeNullSpatialDirection(initialValues, angularMomentum, incoming);
  writeNullSpatialDirection(finalValues, angularMomentum, outgoing);
  target.incomingHeading = nullSpatialHeading(initialValues, angularMomentum);
  target.outgoingHeading = nullSpatialHeading(finalValues, angularMomentum);
  target.deflectionAngleRadians = Math.abs(target.outgoingHeading - target.incomingHeading);
  return target;
}

export function weakFieldDeflectionRadians(impactParameterRs) {
  if (!(impactParameterRs > 0) || !Number.isFinite(impactParameterRs)) {
    throw new RangeError("Weak-field deflection requires b/r_s > 0.");
  }
  return 2 / impactParameterRs;
}
