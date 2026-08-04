import * as THREE from "three";
import { DEFAULT_TRAIL_SPEED_MAX, normalizeSpeed, writeBlueGreenColor } from "../../rendering/VisualizationScale.js";

export class ParticleRenderer {
  constructor({ maxParticles = 1000, maxTrailLength = 256, pointSize = 0.36 } = {}) {
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
    this.trailColors = new Float32Array(maxParticles * Math.max(0, maxTrailLength - 1) * 6);
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
      transparent: true,
      depthWrite: false,
    });
    this.object = new THREE.Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.haloMaterial = new THREE.PointsMaterial({
      color: 0xffb347,
      size: pointSize * 2.35,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.haloObject = new THREE.Points(this.geometry, this.haloMaterial);
    this.haloObject.frustumCulled = false;
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositionAttribute = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailColorAttribute = new THREE.BufferAttribute(this.trailColors, 3);
    this.trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailColorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailGeometry.setAttribute("position", this.trailPositionAttribute);
    this.trailGeometry.setAttribute("color", this.trailColorAttribute);
    this.trailGeometry.setDrawRange(0, 0);
    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.trailObject = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailObject.frustumCulled = false;
    this.appearance = {
      particleSize: pointSize,
      particleOpacity: 1,
      particleBrightness: 1,
      trailVisible: true,
      trailOpacity: 0.88,
      trailBrightness: 1,
      trailFade: 0.82,
      trailColorMode: "speed",
      trailSpeedMaximum: DEFAULT_TRAIL_SPEED_MAX,
    };
    this.speedLegend = { minimum: 0, midpoint: DEFAULT_TRAIL_SPEED_MAX / 2, maximum: DEFAULT_TRAIL_SPEED_MAX };
    this.lastRevision = -1;
  }

  setAppearance(settings) {
    Object.assign(this.appearance, settings);
    this.material.size = this.appearance.particleSize;
    this.material.opacity = this.appearance.particleOpacity;
    this.material.color.setScalar(this.appearance.particleBrightness);
    this.haloMaterial.size = this.appearance.particleSize * 2.35;
    this.haloMaterial.opacity = this.appearance.particleOpacity * 0.22;
    this.trailMaterial.opacity = this.appearance.trailOpacity;
    this.trailObject.visible = this.appearance.trailVisible;
    this.speedLegend.midpoint = this.appearance.trailSpeedMaximum / 2;
    this.speedLegend.maximum = this.appearance.trailSpeedMaximum;
    this.lastRevision = -1;
  }

  resizeTrailCapacity(maxTrailLength) {
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 1) {
      throw new RangeError("ParticleRenderer maxTrailLength must be a positive integer.");
    }
    if (maxTrailLength === this.maxTrailLength) return false;
    this.maxTrailLength = maxTrailLength;
    this.trailPositions = new Float32Array(this.maxParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.trailColors = new Float32Array(this.maxParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.trailGeometry.dispose();
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositionAttribute = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailColorAttribute = new THREE.BufferAttribute(this.trailColors, 3);
    this.trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailColorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailGeometry.setAttribute("position", this.trailPositionAttribute);
    this.trailGeometry.setAttribute("color", this.trailColorAttribute);
    this.trailGeometry.setDrawRange(0, 0);
    this.trailObject.geometry = this.trailGeometry;
    this.lastRevision = -1;
    return true;
  }

  getSpeedLegend() { return this.speedLegend; }

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
        this.#setTrailVertexColor(trailVertexCount, particle, trail, trailIndex - 1);
        this.#setTrailVertexColor(trailVertexCount + 1, particle, trail, trailIndex);
        trailVertexCount += 2;
      }
    }

    this.geometry.setDrawRange(0, count);
    this.trailGeometry.setDrawRange(0, trailVertexCount);
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.trailPositionAttribute.needsUpdate = true;
    this.trailColorAttribute.needsUpdate = true;
    this.lastRevision = revision;
    return true;
  }

  #setTrailVertexColor(vertexIndex, particle, trail, sampleIndex) {
    const age = trail.count > 1 ? sampleIndex / (trail.count - 1) : 1;
    const intensity = this.appearance.trailBrightness * (1 - this.appearance.trailFade * (1 - age));
    let red = 1;
    let green = 0.48;
    let blue = 0.12;
    if (this.appearance.trailColorMode === "speed") {
      const speed = Math.sqrt(
        particle.velocity.x ** 2 + particle.velocity.y ** 2 + particle.velocity.z ** 2,
      );
      const normalized = normalizeSpeed(speed, this.appearance.trailSpeedMaximum);
      writeBlueGreenColor(this.trailColors, vertexIndex * 3, normalized, intensity);
      return;
    } else if (this.appearance.trailColorMode === "distance") {
      const offset = ((trail.head - trail.count + sampleIndex + trail.maxLength) % trail.maxLength) * 3;
      const distance = Math.sqrt(
        trail.positions[offset] ** 2 + trail.positions[offset + 1] ** 2 + trail.positions[offset + 2] ** 2,
      );
      const normalized = Math.min(distance / 16, 1);
      red = normalized;
      green = 0.4 + (1 - normalized) * 0.55;
      blue = 1 - normalized * 0.55;
    } else if (this.appearance.trailColorMode === "age") {
      red = 0.2 + age * 0.8;
      green = 0.75 - age * 0.18;
      blue = 1 - age * 0.82;
    }
    const offset = vertexIndex * 3;
    this.trailColors[offset] = red * intensity;
    this.trailColors[offset + 1] = green * intensity;
    this.trailColors[offset + 2] = blue * intensity;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.haloMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}
