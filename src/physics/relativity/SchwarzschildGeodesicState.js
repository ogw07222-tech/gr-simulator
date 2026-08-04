export const GeodesicStateIndex = Object.freeze({ TIME: 0, RADIUS: 1, PHI: 2, RADIAL_VELOCITY: 3, PROPER_TIME: 4 });

export class SchwarzschildGeodesicState {
  constructor() {
    this.values = new Float64Array(5);
    this.energy = 0;
    this.angularMomentum = 0;
  }

  set(initial) {
    this.values[0] = 0;
    this.values[1] = initial.radius;
    this.values[2] = initial.phi ?? 0;
    this.values[3] = initial.radialVelocity;
    this.values[4] = 0;
    this.energy = initial.energy;
    this.angularMomentum = initial.angularMomentum;
    return this;
  }
}
