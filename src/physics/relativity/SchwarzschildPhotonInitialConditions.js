import { nullRadialVelocity } from "./SchwarzschildNullGeodesicSystem.js";

export const PHOTON_PRESETS = Object.freeze({
  weak: Object.freeze({ name: "Weak Deflection", radius: 40, phi: 0, impactParameter: 10, radialDirection: -1, angularDirection: 1 }),
  strong: Object.freeze({ name: "Strong Deflection", radius: 20, phi: 0, impactParameter: 3, radialDirection: -1, angularDirection: 1 }),
  nearCritical: Object.freeze({ name: "Near Critical", radius: 20, phi: 0, impactParameter: 2.62, radialDirection: -1, angularDirection: 1 }),
  capture: Object.freeze({ name: "Capture", radius: 20, phi: 0, impactParameter: 2.4, radialDirection: -1, angularDirection: 1 }),
});

export function createPhotonInitialCondition({
  radius,
  phi = 0,
  impactParameter,
  radialDirection = -1,
  angularDirection = 1,
  energy = 1,
}) {
  if (!(radius > 1) || !Number.isFinite(radius)) throw new RangeError("Photon launch radius must satisfy r > r_s.");
  if (!(impactParameter >= 0) || !Number.isFinite(impactParameter)) throw new RangeError("Photon impact parameter must be finite and non-negative.");
  if (!Number.isFinite(phi) || ![1, -1].includes(Math.sign(radialDirection)) || ![1, -1].includes(Math.sign(angularDirection))) {
    throw new RangeError("Photon launch directions must be finite signed directions.");
  }
  const angularMomentum = impactParameter * energy * Math.sign(angularDirection);
  return Object.freeze({
    radius,
    phi,
    energy,
    angularMomentum,
    radialVelocity: nullRadialVelocity(radius, energy, angularMomentum, radialDirection),
    affineParameter: 0,
    time: 0,
    impactParameter,
    radialDirection: Math.sign(radialDirection),
    angularDirection: Math.sign(angularDirection),
  });
}

export function photonPreset(key) {
  const preset = PHOTON_PRESETS[key];
  if (!preset) throw new RangeError(`Unknown photon preset: ${key}`);
  return preset;
}
