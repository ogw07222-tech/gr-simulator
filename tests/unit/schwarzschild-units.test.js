import { describe, expect, it } from "vitest";
import {
  PHYSICAL_CONSTANTS,
  SchwarzschildUnits,
  fractionOfCToVelocity,
  gravitationalTimeScaleSI,
  kilogramsToSolarMasses,
  kilometresToMetres,
  metresToKilometres,
  schwarzschildRadiusSI,
  solarMassesToKilograms,
  velocityToFractionOfC,
} from "../../src/physics/index.js";

describe("Schwarzschild SI units", () => {
  it("uses the CODATA gravitational constant and exact speed of light", () => {
    expect(PHYSICAL_CONSTANTS.gravitationalConstant).toBe(6.67430e-11);
    expect(PHYSICAL_CONSTANTS.speedOfLight).toBe(299792458);
  });

  it("converts one solar mass and its Schwarzschild scales", () => {
    const mass = solarMassesToKilograms(1);
    expect(mass).toBe(PHYSICAL_CONSTANTS.solarMass);
    expect(kilogramsToSolarMasses(mass)).toBeCloseTo(1, 14);
    expect(schwarzschildRadiusSI(mass)).toBeCloseTo(2953.3393820668784, 10);
    expect(gravitationalTimeScaleSI(mass)).toBeCloseTo(9.851279787922078e-6, 10);
  });

  it("round-trips length, time, velocity, and angular momentum", () => {
    const units = new SchwarzschildUnits(solarMassesToKilograms(4e6));
    const radius = 7.25;
    const time = 13.5;
    const angularMomentum = 1.75;
    expect(units.siRadiusToNormalized(units.normalizedRadiusToSI(radius))).toBeCloseTo(radius, 14);
    expect(units.siTimeToNormalized(units.normalizedTimeToSI(time))).toBeCloseTo(time, 14);
    expect(units.siSpecificAngularMomentumToNormalized(
      units.normalizedSpecificAngularMomentumToSI(angularMomentum),
    )).toBeCloseTo(angularMomentum, 14);
    expect(velocityToFractionOfC(fractionOfCToVelocity(0.4))).toBeCloseTo(0.4, 14);
    expect(metresToKilometres(kilometresToMetres(12.5))).toBe(12.5);
  });

  it("rejects non-positive or non-finite physical mass", () => {
    expect(() => schwarzschildRadiusSI(0)).toThrow(RangeError);
    expect(() => schwarzschildRadiusSI(-1)).toThrow(RangeError);
    expect(() => schwarzschildRadiusSI(Infinity)).toThrow(RangeError);
  });
});
