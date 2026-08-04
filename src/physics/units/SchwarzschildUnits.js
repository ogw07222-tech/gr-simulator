import { PHYSICAL_CONSTANTS } from "./PhysicalConstants.js";
import { schwarzschildRadiusSI } from "./UnitSystem.js";

export class SchwarzschildUnits {
  constructor(massKg) { this.setMass(massKg); }

  setMass(massKg) {
    const lengthScale = schwarzschildRadiusSI(massKg);
    this.massKg = massKg;
    this.lengthScale = lengthScale;
    this.timeScale = lengthScale / PHYSICAL_CONSTANTS.speedOfLight;
  }

  siRadiusToNormalized(value) { return value / this.lengthScale; }
  normalizedRadiusToSI(value) { return value * this.lengthScale; }
  siTimeToNormalized(value) { return value / this.timeScale; }
  normalizedTimeToSI(value) { return value * this.timeScale; }
  siSpecificAngularMomentumToNormalized(value) {
    return value / (PHYSICAL_CONSTANTS.speedOfLight * this.lengthScale);
  }
  normalizedSpecificAngularMomentumToSI(value) {
    return value * PHYSICAL_CONSTANTS.speedOfLight * this.lengthScale;
  }
}
