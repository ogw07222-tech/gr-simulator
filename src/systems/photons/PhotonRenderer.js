import * as THREE from "three";
import { RenderScaleTransform } from "../../rendering/scale/RenderScaleTransform.js";

export class PhotonRenderer {
  constructor({ maxPhotons = 64, maxTrailLength = 128, pointSize = 8, scaleTransform = null } = {}) {
    if (!Number.isInteger(maxPhotons) || maxPhotons < 1 || maxPhotons > 64) {
      throw new RangeError("PhotonRenderer maxPhotons must be an integer from 1 to 64.");
    }
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 2) {
      throw new RangeError("PhotonRenderer maxTrailLength must be an integer >= 2.");
    }
    this.maxPhotons = maxPhotons;
    this.maxTrailLength = maxTrailLength;
    this.scaleTransform = scaleTransform ?? new RenderScaleTransform();
    this.markerPositions = new Float32Array(maxPhotons * 3);
    this.trailPositions = new Float32Array(maxPhotons * (maxTrailLength - 1) * 6);

    this.markerGeometry = new THREE.BufferGeometry();
    this.markerAttribute = new THREE.BufferAttribute(this.markerPositions, 3);
    this.markerAttribute.setUsage(THREE.DynamicDrawUsage);
    this.markerGeometry.setAttribute("position", this.markerAttribute);
    this.markerGeometry.setDrawRange(0, 0);
    this.markerMaterial = new THREE.PointsMaterial({
      color: 0xfff2a8,
      size: pointSize,
      sizeAttenuation: false,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    this.markerObject = new THREE.Points(this.markerGeometry, this.markerMaterial);
    this.markerObject.frustumCulled = false;

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailAttribute = new THREE.BufferAttribute(this.trailPositions, 3);
    this.trailAttribute.setUsage(THREE.DynamicDrawUsage);
    this.trailGeometry.setAttribute("position", this.trailAttribute);
    this.trailGeometry.setDrawRange(0, 0);
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    this.trailObject = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailObject.frustumCulled = false;

    this.enabled = false;
    this.markerObject.visible = false;
    this.trailObject.visible = false;
    this.lastRevision = -1;
    this.lastTransformRevision = -1;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.markerObject.visible = this.enabled;
    this.trailObject.visible = this.enabled;
    return this.enabled;
  }

  sync(subsystem) {
    if (!this.enabled) return false;
    const revision = subsystem.revision();
    const transformRevision = this.scaleTransform.revision();
    if (revision === this.lastRevision && transformRevision === this.lastTransformRevision) return false;

    const count = Math.min(subsystem.count(), this.maxPhotons);
    let trailVertexCount = 0;
    for (let index = 0; index < count; index += 1) {
      const position = subsystem.positionAt(index);
      const markerOffset = index * 3;
      this.scaleTransform.writeArray(this.markerPositions, markerOffset, position.x, position.y, position.z);

      const trail = subsystem.trailAt(index);
      const segmentCount = Math.max(0, Math.min(trail.count, this.maxTrailLength) - 1);
      const oldest = trail.oldestIndex();
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const a = ((oldest + segment) % trail.maxLength) * 3;
        const b = ((oldest + segment + 1) % trail.maxLength) * 3;
        let target = trailVertexCount * 3;
        this.scaleTransform.writeArray(
          this.trailPositions,
          target,
          trail.positions[a], trail.positions[a + 1], trail.positions[a + 2],
        );
        target += 3;
        this.scaleTransform.writeArray(
          this.trailPositions,
          target,
          trail.positions[b], trail.positions[b + 1], trail.positions[b + 2],
        );
        trailVertexCount += 2;
      }
    }

    this.markerGeometry.setDrawRange(0, count);
    this.trailGeometry.setDrawRange(0, trailVertexCount);
    this.markerAttribute.needsUpdate = true;
    if (trailVertexCount > 0) this.trailAttribute.needsUpdate = true;
    this.lastRevision = revision;
    this.lastTransformRevision = transformRevision;
    return true;
  }

  dispose() {
    this.markerGeometry.dispose();
    this.markerMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}
