export class SnapshotManager {
  constructor({ createBuffer, copy, bufferCount = 2 } = {}) {
    if (typeof createBuffer !== "function") throw new TypeError("SnapshotManager requires createBuffer.");
    if (typeof copy !== "function") throw new TypeError("SnapshotManager requires copy.");
    if (!Number.isInteger(bufferCount) || bufferCount < 2) throw new RangeError("SnapshotManager requires at least two buffers.");

    this.copy = copy;
    this.buffers = new Array(bufferCount);
    for (let index = 0; index < bufferCount; index += 1) {
      const buffer = createBuffer();
      if (!buffer || !buffer.data || !buffer.view) {
        throw new TypeError("Snapshot buffers require data and view properties.");
      }
      if (!Object.isFrozen(buffer.view)) {
        throw new TypeError("Snapshot views must be frozen.");
      }
      this.buffers[index] = buffer;
    }

    this.currentIndex = -1;
    this.currentRevision = 0;
  }

  publish(source) {
    this.currentIndex = (this.currentIndex + 1) % this.buffers.length;
    const buffer = this.buffers[this.currentIndex];
    this.copy(buffer.data, source);
    this.currentRevision += 1;
    return buffer.view;
  }

  latest() {
    return this.currentIndex < 0 ? null : this.buffers[this.currentIndex].view;
  }

  revision() {
    return this.currentRevision;
  }
}
