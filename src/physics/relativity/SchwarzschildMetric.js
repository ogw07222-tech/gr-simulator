export class SchwarzschildMetric {
  static lapseSquared(radius) {
    if (!(radius > 1) || !Number.isFinite(radius)) return 0;
    return 1 - 1 / radius;
  }

  static components(radius, target = new Float64Array(4)) {
    const f = this.lapseSquared(radius);
    if (!(f > 0)) throw new RangeError("Standard Schwarzschild coordinates require r > r_s.");
    target[0] = -f;
    target[1] = 1 / f;
    target[2] = radius * radius;
    target[3] = radius * radius;
    return target;
  }
}
