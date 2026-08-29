export class PhotonTrail {
  constructor(maxLength = 128) {
    if (!Number.isInteger(maxLength) || maxLength < 2) {
      throw new RangeError("PhotonTrail maxLength must be an integer >= 2.");
    }
    this.maxLength = maxLength;
    this.positions = new Float64Array(maxLength * 3);
    this.head = 0;
    this.count = 0;
  }

  clear() {
    this.head = 0;
    this.count = 0;
  }

  append(x, y, z) {
    const offset = this.head * 3;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.head = (this.head + 1) % this.maxLength;
    this.count = Math.min(this.count + 1, this.maxLength);
    return this.count;
  }

  oldestIndex() {
    return (this.head - this.count + this.maxLength) % this.maxLength;
  }
}
