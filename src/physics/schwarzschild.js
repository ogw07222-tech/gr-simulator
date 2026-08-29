export class SchwarzschildModel {
  constructor({ G = 1, c = 10, softening = 0.45 } = {}) {
    this.G = G;
    this.c = c;
    this.softening = softening;
  }

  schwarzschildRadius(mass) {
    return (2 * this.G * Math.max(0, mass)) / (this.c * this.c);
  }

  spatialRadius(dx, dy, dz) {
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  lapse(mass, radius) {
    const rs = this.schwarzschildRadius(mass);
    if (radius <= rs) return 0;
    return Math.sqrt(Math.max(0, 1 - rs / radius));
  }

  curvatureProxy(mass, radius) {
    const rs = this.schwarzschildRadius(mass);
    return rs / Math.max(radius, this.softening);
  }

  // Schwarzschild 공간 절편을 직교좌표 격자 변위로 표현한 시각화용 약한 장 근사.
  // 완전한 Einstein 방정식 수치해가 아니며, 물리량과 시각 변형을 명확히 분리한다.
  displacementMagnitude(mass, radius, scale = 12) {
    const rs = this.schwarzschildRadius(mass);
    return (scale * rs) / Math.max(radius * radius, this.softening ** 2);
  }
}
