import * as THREE from "three";

export class ParticleRenderer {
  constructor({ maxParticles = 1000, pointSize = 0.18 } = {}) {
    if (!Number.isInteger(maxParticles) || maxParticles < 1) {
      throw new RangeError("ParticleRenderer maxParticles must be a positive integer.");
    }

    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
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
    this.lastRevision = -1;
  }

  sync(manager) {
    const revision = manager.revision();
    if (revision === this.lastRevision) return false;

    const count = manager.count();
    for (let index = 0; index < count; index += 1) {
      const particle = manager.particleAt(index);
      const offset = index * 3;
      this.positions[offset] = particle.position.x;
      this.positions[offset + 1] = particle.position.y;
      this.positions[offset + 2] = particle.position.z;
      this.colors[offset] = particle.color.r;
      this.colors[offset + 1] = particle.color.g;
      this.colors[offset + 2] = particle.color.b;
    }

    this.geometry.setDrawRange(0, count);
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.lastRevision = revision;
    return true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
