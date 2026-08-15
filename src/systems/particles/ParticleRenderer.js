import * as THREE from "three";
import { DEFAULT_TRAIL_SPEED_MAX, normalizeSpeed, writeSpeedToWhiteColor } from "../../rendering/VisualizationScale.js";
import { RenderScaleTransform } from "../../rendering/scale/RenderScaleTransform.js";

export class ParticleRenderer {
  constructor({ maxParticles = 1000, maxTrailParticles = maxParticles, maxTrailLength = 256, pointSize = 10, scaleTransform = null } = {}) {
    if (!Number.isInteger(maxParticles) || maxParticles < 1) {
      throw new RangeError("ParticleRenderer maxParticles must be a positive integer.");
    }
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 1) {
      throw new RangeError("ParticleRenderer maxTrailLength must be a positive integer.");
    }

    this.maxParticles = maxParticles;
    this.maxTrailParticles = maxTrailParticles;
    this.scaleTransform = scaleTransform ?? new RenderScaleTransform();
    this.maxTrailLength = maxTrailLength;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.trailPositions = new Float32Array(maxTrailParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.trailColors = new Float32Array(maxTrailParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.positionUpdateRange = { start: 0, count: 0 };
    this.colorUpdateRange = { start: 0, count: 0 };
    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("color", this.colorAttribute);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      size: pointSize,
      // With attenuation disabled, Three.js treats size as CSS pixels and applies renderer DPR once.
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    this.object = new THREE.Points(this.geometry, this.material);
    this.object.frustumCulled = false;
    this.haloMaterial = new THREE.PointsMaterial({
      color: 0xc8ffff,
      size: pointSize * 2.35,
      sizeAttenuation: false,
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
    this.trailPositionUpdateRange = { start: 0, count: 0 };
    this.trailColorUpdateRange = { start: 0, count: 0 };
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
    this.lastTransformRevision = -1;
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
    this.trailPositions = new Float32Array(this.maxTrailParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.trailColors = new Float32Array(this.maxTrailParticles * Math.max(0, maxTrailLength - 1) * 6);
    this.trailGeometry.dispose();
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositionAttribute = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailColorAttribute = new THREE.BufferAttribute(this.trailColors, 3);
    this.trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailColorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailPositionUpdateRange = { start: 0, count: 0 };
    this.trailColorUpdateRange = { start: 0, count: 0 };
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
    const transformRevision = this.scaleTransform.revision();
    if (revision === this.lastRevision && transformRevision === this.lastTransformRevision) return false;

    const count = manager.count();
    let trailVertexCount = 0;
    for (let index = 0; index < count; index += 1) {
      const particle = manager.particleAt(index);
      const offset = index * 3;
      this.scaleTransform.writeArray(
        this.positions, offset, particle.position.x, particle.position.y, particle.position.z,
      );
      const speed = Math.sqrt(
        particle.velocity.x ** 2 + particle.velocity.y ** 2 + particle.velocity.z ** 2,
      );
      const normalizedSpeed = normalizeSpeed(speed, this.appearance.trailSpeedMaximum);
      writeSpeedToWhiteColor(this.colors, offset, normalizedSpeed);

      const trail = particle.trail;
      if (index >= this.maxTrailParticles) continue;
      const oldest = (trail.head - trail.count + trail.maxLength) % trail.maxLength;
      for (let trailIndex = 1; trailIndex < trail.count; trailIndex += 1) {
        const previous = ((oldest + trailIndex - 1) % trail.maxLength) * 3;
        const current = ((oldest + trailIndex) % trail.maxLength) * 3;
        let target = trailVertexCount * 3;
        this.scaleTransform.writeArray(
          this.trailPositions, target,
          trail.positions[previous], trail.positions[previous + 1], trail.positions[previous + 2],
        );
        target += 3;
        this.scaleTransform.writeArray(
          this.trailPositions, target,
          trail.positions[current], trail.positions[current + 1], trail.positions[current + 2],
        );
        this.#setTrailVertexColor(trailVertexCount, normalizedSpeed, trail, trailIndex - 1);
        this.#setTrailVertexColor(trailVertexCount + 1, normalizedSpeed, trail, trailIndex);
        trailVertexCount += 2;
      }
    }

    this.geometry.setDrawRange(0, count);
    this.trailGeometry.setDrawRange(0, trailVertexCount);
    this.#markUpdated(this.positionAttribute, this.positionUpdateRange, count * 3);
    this.#markUpdated(this.colorAttribute, this.colorUpdateRange, count * 3);
    this.#markUpdated(this.trailPositionAttribute, this.trailPositionUpdateRange, trailVertexCount * 3);
    this.#markUpdated(this.trailColorAttribute, this.trailColorUpdateRange, trailVertexCount * 3);
    this.lastRevision = revision;
    this.lastTransformRevision = transformRevision;
    return true;
  }

  #markUpdated(attribute, range, count) {
    range.count = count;
    if (attribute.updateRanges.length === 0) attribute.updateRanges.push(range);
    attribute.needsUpdate = true;
  }

  #setTrailVertexColor(vertexIndex, normalizedSpeed, trail, sampleIndex) {
    const age = trail.count > 1 ? sampleIndex / (trail.count - 1) : 1;
    const intensity = this.appearance.trailBrightness * (1 - this.appearance.trailFade * (1 - age));
    let red = 1;
    let green = 0.48;
    let blue = 0.12;
    if (this.appearance.trailColorMode === "speed") {
      writeSpeedToWhiteColor(this.trailColors, vertexIndex * 3, normalizedSpeed, intensity);
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
