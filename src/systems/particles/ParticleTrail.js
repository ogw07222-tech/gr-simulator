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

  resize(maxLength) {
    if (!Number.isInteger(maxLength) || maxLength < 1) {
      throw new RangeError("ParticleTrail maxLength must be a positive integer.");
    }
    if (maxLength === this.maxLength) return false;
    const previous = this.positions;
    const previousLength = this.maxLength;
    const preserved = Math.min(this.count, maxLength);
    const next = new Float32Array(maxLength * 3);
    const first = (this.head - preserved + previousLength) % previousLength;
    for (let index = 0; index < preserved; index += 1) {
      const source = ((first + index) % previousLength) * 3;
      const target = index * 3;
      next[target] = previous[source];
      next[target + 1] = previous[source + 1];
      next[target + 2] = previous[source + 2];
    }
    this.positions = next;
    this.maxLength = maxLength;
    this.count = preserved;
    this.head = preserved % maxLength;
    return true;
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

  pushIfSeparated(position, minimumDistanceSquared) {
    if (!this.enabled) return false;
    if (this.count > 0) {
      const previous = ((this.head - 1 + this.maxLength) % this.maxLength) * 3;
      const dx = position.x - this.positions[previous];
      const dy = position.y - this.positions[previous + 1];
      const dz = position.z - this.positions[previous + 2];
      if (dx * dx + dy * dy + dz * dz < minimumDistanceSquared) return false;
    }
    return this.push(position);
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
