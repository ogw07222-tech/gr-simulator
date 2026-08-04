import { effectivePotential, circularOrbitConstants } from "./SchwarzschildConstantsOfMotion.js";
import { SchwarzschildMetric } from "./SchwarzschildMetric.js";

function createResult(radius, radialVelocity, energy, angularMomentum, phi = 0) {
  return { radius, radialVelocity, energy, angularMomentum, phi };
}

export function createCircularInitialCondition(radius, phi = 0) {
  if (!(radius > 1.5)) throw new RangeError("Circular timelike orbit requires r > 1.5 r_s.");
  const constants = circularOrbitConstants(radius);
  return createResult(radius, 0, constants.energy, constants.angularMomentum, phi);
}

export function createLocalVelocityInitialCondition(radius, radialBeta, tangentialBeta, phi = 0) {
  const f = SchwarzschildMetric.lapseSquared(radius);
  if (!(f > 0)) throw new RangeError("A static local observer requires r > r_s.");
  const betaSquared = radialBeta * radialBeta + tangentialBeta * tangentialBeta;
  if (!(betaSquared < 1) || betaSquared < 0) throw new RangeError("Local velocity must be subluminal.");
  const gamma = 1 / Math.sqrt(1 - betaSquared);
  return createResult(radius, gamma * radialBeta * Math.sqrt(f), gamma * Math.sqrt(f), gamma * radius * tangentialBeta, phi);
}

export function createConstantsInitialCondition(radius, energy, angularMomentum, radialDirection = 1, phi = 0) {
  if (!(radius > 1) || !(energy > 0) || !Number.isFinite(energy)
    || !Number.isFinite(angularMomentum) || !Number.isFinite(phi)) {
    throw new RangeError("Invalid conserved-quantity initial condition.");
  }
  const radialSquared = energy * energy - effectivePotential(radius, angularMomentum);
  if (radialSquared < -1e-12) throw new RangeError("Conserved quantities do not permit this radius.");
  const radialVelocity = Math.sign(radialDirection || 1) * Math.sqrt(Math.max(0, radialSquared));
  return createResult(radius, radialVelocity, energy, angularMomentum, phi);
}
