export class ParticleTrail {
  constructor(maxLength, enabled = true) {
    if (!Number.isInteger(maxLength) || maxLength < 1) {
      throw new RangeError("ParticleTrail maxLength must be a positive integer.");
    }

    this.maxLength = maxLength;
    this.positions = new Float32Array(maxLength * 3);
    this.enabled = Boolean(enabled);
    this.head = 0;
    this.count = 0;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }

  get length() {
    return this.count;
  }

  push(position) {
    if (!this.enabled) return false;

    const offset = this.head * 3;
    this.positions[offset] = position.x;
    this.positions[offset + 1] = position.y;
    this.positions[offset + 2] = position.z;
    this.head = (this.head + 1) % this.maxLength;
    if (this.count < this.maxLength) this.count += 1;
    return true;
  }

  read(index, target) {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw new RangeError("ParticleTrail index is out of range.");
    }
    if (!target || typeof target.set !== "function") {
      throw new TypeError("ParticleTrail read requires a vector target.");
    }

    const oldest = (this.head - this.count + this.maxLength) % this.maxLength;
    const offset = ((oldest + index) % this.maxLength) * 3;
    target.set(this.positions[offset], this.positions[offset + 1], this.positions[offset + 2]);
    return target;
  }
}
