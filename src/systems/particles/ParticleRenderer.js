import * as THREE from "three";

export class ParticleRenderer {
  constructor({ maxParticles = 1000, maxTrailLength = 256, pointSize = 0.18 } = {}) {
    if (!Number.isInteger(maxParticles) || maxParticles < 1) {
      throw new RangeError("ParticleRenderer maxParticles must be a positive integer.");
    }
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 1) {
      throw new RangeError("ParticleRenderer maxTrailLength must be a positive integer.");
    }

    this.maxParticles = maxParticles;
    this.maxTrailLength = maxTrailLength;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.trailPositions = new Float32Array(maxParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("color", this.colorAttribute);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      size: pointSize,
      sizeAttenuation: true,
      vertexColors: true,
    });
    this.object = new THREE.Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositionAttribute = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailGeometry.setAttribute("position", this.trailPositionAttribute);
    this.trailGeometry.setDrawRange(0, 0);
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0x54e2ff,
      transparent: true,
      opacity: 0.65,
    });
    this.trailObject = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailObject.frustumCulled = false;
    this.lastRevision = -1;
  }

  sync(manager) {
    const revision = manager.revision();
    if (revision === this.lastRevision) return false;

    const count = manager.count();
    let trailVertexCount = 0;
    for (let index = 0; index < count; index += 1) {
      const particle = manager.particleAt(index);
      const offset = index * 3;
      this.positions[offset] = particle.position.x;
      this.positions[offset + 1] = particle.position.y;
      this.positions[offset + 2] = particle.position.z;
      this.colors[offset] = particle.color.r;
      this.colors[offset + 1] = particle.color.g;
      this.colors[offset + 2] = particle.color.b;

      const trail = particle.trail;
      const oldest = (trail.head - trail.count + trail.maxLength) % trail.maxLength;
      for (let trailIndex = 1; trailIndex < trail.count; trailIndex += 1) {
        const previous = ((oldest + trailIndex - 1) % trail.maxLength) * 3;
        const current = ((oldest + trailIndex) % trail.maxLength) * 3;
        let target = trailVertexCount * 3;
        this.trailPositions[target] = trail.positions[previous];
        this.trailPositions[target + 1] = trail.positions[previous + 1];
        this.trailPositions[target + 2] = trail.positions[previous + 2];
        target += 3;
        this.trailPositions[target] = trail.positions[current];
        this.trailPositions[target + 1] = trail.positions[current + 1];
        this.trailPositions[target + 2] = trail.positions[current + 2];
        trailVertexCount += 2;
      }
    }

    this.geometry.setDrawRange(0, count);
    this.trailGeometry.setDrawRange(0, trailVertexCount);
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.trailPositionAttribute.needsUpdate = true;
    this.lastRevision = revision;
    return true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}
