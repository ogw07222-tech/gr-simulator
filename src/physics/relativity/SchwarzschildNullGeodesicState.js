export const NullGeodesicStateIndex = Object.freeze({
  TIME: 0,
  RADIUS: 1,
  PHI: 2,
  RADIAL_VELOCITY: 3,
  AFFINE_PARAMETER: 4,
});

export class SchwarzschildNullGeodesicState {
  constructor() {
    this.values = new Float64Array(5);
    this.energy = 1;
    this.angularMomentum = 0;
  }

  set(initial) {
    this.values[NullGeodesicStateIndex.TIME] = initial.time ?? 0;
    this.values[NullGeodesicStateIndex.RADIUS] = initial.radius;
    this.values[NullGeodesicStateIndex.PHI] = initial.phi ?? 0;
    this.values[NullGeodesicStateIndex.RADIAL_VELOCITY] = initial.radialVelocity;
    this.values[NullGeodesicStateIndex.AFFINE_PARAMETER] = initial.affineParameter ?? 0;
    this.energy = initial.energy ?? 1;
    this.angularMomentum = initial.angularMomentum ?? 0;
    return this;
  }
}
