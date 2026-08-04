import { Particle } from "./Particle.js";

export class ParticleManager {
  constructor({ maxParticles = 1000, maxTrailLength = 256, domainHalfExtent = Infinity } = {}) {
    if (!Number.isInteger(maxParticles) || maxParticles < 1) throw new RangeError("maxParticles must be a positive integer.");
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 1) throw new RangeError("maxTrailLength must be a positive integer.");
    if (!(domainHalfExtent > 0)) throw new RangeError("domainHalfExtent must be positive.");

    this.maxParticles = maxParticles;
    this.maxTrailLength = maxTrailLength;
    this.domainHalfExtent = domainHalfExtent;
    this.particles = new Array(maxParticles);
    this.activeSlots = new Int32Array(maxParticles);
    this.slotActiveIndex = new Int32Array(maxParticles);
    this.freeSlots = new Int32Array(maxParticles);
    this.idToSlot = new Map();
    this.activeCount = 0;
    this.freeCount = maxParticles;
    this.nextId = 1;
    this.selectedId = null;
    this.currentRevision = 0;

    for (let slot = 0; slot < maxParticles; slot += 1) {
      this.particles[slot] = new Particle(maxTrailLength);
      this.slotActiveIndex[slot] = -1;
      this.freeSlots[slot] = maxParticles - slot - 1;
    }
  }

  create(options = {}) {
    if (this.activeCount >= this.maxParticles) throw new RangeError("Maximum particle count reached.");
    if (!this.#containsPosition(options.position)) throw new RangeError("Particle initial position is outside the supported domain.");
    const id = options.id ?? this.#nextAvailableId();
    if (this.idToSlot.has(id)) throw new Error(`Particle id already exists: ${id}`);

    const slot = this.freeSlots[this.freeCount - 1];
    const particle = this.particles[slot];
    particle.activate(id, options);
    this.freeCount -= 1;
    this.slotActiveIndex[slot] = this.activeCount;
    this.activeSlots[this.activeCount] = slot;
    this.activeCount += 1;
    this.idToSlot.set(id, slot);
    this.currentRevision += 1;
    return particle;
  }

  destroy(id) {
    const slot = this.idToSlot.get(id);
    if (slot === undefined) return false;
    const activeIndex = this.slotActiveIndex[slot];
    const lastIndex = this.activeCount - 1;
    const lastSlot = this.activeSlots[lastIndex];
    this.activeSlots[activeIndex] = lastSlot;
    this.slotActiveIndex[lastSlot] = activeIndex;
    this.activeCount = lastIndex;
    this.slotActiveIndex[slot] = -1;
    this.freeSlots[this.freeCount] = slot;
    this.freeCount += 1;
    this.idToSlot.delete(id);
    this.particles[slot].deactivate();
    if (this.selectedId === id) this.selectedId = null;
    this.currentRevision += 1;
    return true;
  }

  reset(id = null) {
    if (id !== null) {
      const particle = this.findById(id);
      if (!particle) return false;
      particle.reset();
      this.currentRevision += 1;
      return true;
    }
    for (let index = 0; index < this.activeCount; index += 1) this.particles[this.activeSlots[index]].reset();
    if (this.activeCount > 0) this.currentRevision += 1;
    return true;
  }

  clear() {
    for (let index = 0; index < this.activeCount; index += 1) this.particles[this.activeSlots[index]].deactivate();
    this.idToSlot.clear();
    this.activeCount = 0;
    this.freeCount = this.maxParticles;
    this.selectedId = null;
    for (let slot = 0; slot < this.maxParticles; slot += 1) {
      this.slotActiveIndex[slot] = -1;
      this.freeSlots[slot] = this.maxParticles - slot - 1;
    }
    this.currentRevision += 1;
  }

  update(delta) {
    if (!Number.isFinite(delta) || delta < 0) throw new RangeError("Particle update delta must be finite and non-negative.");
    if (this.activeCount === 0 || delta === 0) return;
    for (let index = 0; index < this.activeCount; index += 1) {
      this.particles[this.activeSlots[index]].update(delta, this.domainHalfExtent);
    }
    this.currentRevision += 1;
  }

  count() { return this.activeCount; }

  findById(id) {
    const slot = this.idToSlot.get(id);
    return slot === undefined ? null : this.particles[slot];
  }

  particleAt(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.activeCount) return null;
    return this.particles[this.activeSlots[index]];
  }

  spawnBatch(definitions) {
    if (!Array.isArray(definitions)) throw new TypeError("spawnBatch requires an array.");
    if (definitions.length > this.freeCount) throw new RangeError("Batch exceeds the remaining particle capacity.");
    const created = new Array(definitions.length);
    let createdCount = 0;
    try {
      for (; createdCount < definitions.length; createdCount += 1) created[createdCount] = this.create(definitions[createdCount]);
    } catch (error) {
      for (let index = createdCount - 1; index >= 0; index -= 1) this.destroy(created[index].id);
      throw error;
    }
    return created;
  }

  select(id) {
    if (id === null) { this.selectedId = null; return null; }
    const particle = this.findById(id);
    if (!particle) return null;
    this.selectedId = id;
    return particle;
  }

  selected() { return this.selectedId === null ? null : this.findById(this.selectedId); }
  clearSelection() { this.selectedId = null; }

  resizeTrailCapacity(maxTrailLength) {
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 1) throw new RangeError("maxTrailLength must be a positive integer.");
    if (maxTrailLength === this.maxTrailLength) return false;
    for (let slot = 0; slot < this.maxParticles; slot += 1) this.particles[slot].trail.resize(maxTrailLength);
    this.maxTrailLength = maxTrailLength;
    this.currentRevision += 1;
    return true;
  }

  revision() { return this.currentRevision; }
  touch() { this.currentRevision += 1; }
  dispose() { this.clear(); }

  #nextAvailableId() {
    while (this.idToSlot.has(this.nextId)) this.nextId += 1;
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  #containsPosition(position) {
    if (position === undefined || position === null || this.domainHalfExtent === Infinity) return true;
    const x = Array.isArray(position) ? position[0] ?? 0 : position.x ?? 0;
    const y = Array.isArray(position) ? position[1] ?? 0 : position.y ?? 0;
    const z = Array.isArray(position) ? position[2] ?? 0 : position.z ?? 0;
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
      && Math.abs(x) <= this.domainHalfExtent
      && Math.abs(y) <= this.domainHalfExtent
      && Math.abs(z) <= this.domainHalfExtent;
  }
}
