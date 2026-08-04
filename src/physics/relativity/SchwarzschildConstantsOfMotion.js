import { SchwarzschildMetric } from "./SchwarzschildMetric.js";

export function effectivePotential(radius, angularMomentum) {
  if (!(radius > 1)) return Infinity;
  return SchwarzschildMetric.lapseSquared(radius) * (1 + angularMomentum * angularMomentum / (radius * radius));
}

export function radialAcceleration(radius, angularMomentum) {
  const l2 = angularMomentum * angularMomentum;
  return -1 / (2 * radius * radius) + l2 / (radius ** 3) - 1.5 * l2 / (radius ** 4);
}

export function circularOrbitConstants(radius, target = { energy: 0, angularMomentum: 0 }) {
  if (!(radius > 1.5) || !Number.isFinite(radius)) throw new RangeError("Timelike circular orbits require r > 1.5 r_s.");
  target.angularMomentum = radius / Math.sqrt(2 * radius - 3);
  target.energy = Math.sqrt(2) * (radius - 1) / Math.sqrt(radius * (2 * radius - 3));
  return target;
}

export const photonSphereRadius = () => 1.5;
export const marginallyBoundRadius = () => 2;
export const iscoRadius = () => 3;
