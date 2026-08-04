import { PHYSICAL_CONSTANTS } from "./PhysicalConstants.js";

export const solarMassesToKilograms = (value) => value * PHYSICAL_CONSTANTS.solarMass;
export const kilogramsToSolarMasses = (value) => value / PHYSICAL_CONSTANTS.solarMass;
export const metresToKilometres = (value) => value / 1000;
export const kilometresToMetres = (value) => value * 1000;
export const velocityToFractionOfC = (value) => value / PHYSICAL_CONSTANTS.speedOfLight;
export const fractionOfCToVelocity = (value) => value * PHYSICAL_CONSTANTS.speedOfLight;

export function schwarzschildRadiusSI(massKg) {
  if (!(massKg > 0) || !Number.isFinite(massKg)) throw new RangeError("Mass must be positive and finite.");
  const { gravitationalConstant: G, speedOfLight: c } = PHYSICAL_CONSTANTS;
  return 2 * G * massKg / (c * c);
}

export function gravitationalTimeScaleSI(massKg) {
  return schwarzschildRadiusSI(massKg) / PHYSICAL_CONSTANTS.speedOfLight;
}
