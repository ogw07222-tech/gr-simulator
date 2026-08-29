import * as THREE from "three";
import { RenderScaleTransform } from "../../rendering/scale/RenderScaleTransform.js";

export class PhotonRenderer {
  constructor({ maxTrailLength = 128, pointSize = 8, scaleTransform = null } = {}) {
    if (!Number.isInteger(maxTrailLength) || maxTrailLength < 2) {
      throw new RangeError("PhotonRenderer maxTrailLength must be an integer >= 2.");
    }
    this.maxTrailLength = maxTrailLength;
    this.scaleTransform = scaleTransform ?? new RenderScaleTransform();
    this.markerPositions = new Float32Array(3);
    this.trailPositions = new Float32Array((maxTrailLength - 1) * 6);

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

    const position = subsystem.position;
    this.scaleTransform.writeArray(this.markerPositions, 0, position.x, position.y, position.z);
    this.markerGeometry.setDrawRange(0, 1);
    this.markerAttribute.needsUpdate = true;

    const trail = subsystem.trail;
    const segmentCount = Math.max(0, Math.min(trail.count, this.maxTrailLength) - 1);
    const oldest = trail.oldestIndex();
    for (let segment = 0; segment < segmentCount; segment += 1) {
      const a = ((oldest + segment) % trail.maxLength) * 3;
      const b = ((oldest + segment + 1) % trail.maxLength) * 3;
      const target = segment * 6;
      this.scaleTransform.writeArray(
        this.trailPositions,
        target,
        trail.positions[a], trail.positions[a + 1], trail.positions[a + 2],
      );
      this.scaleTransform.writeArray(
        this.trailPositions,
        target + 3,
        trail.positions[b], trail.positions[b + 1], trail.positions[b + 2],
      );
    }
    this.trailGeometry.setDrawRange(0, segmentCount * 2);
    if (segmentCount > 0) this.trailAttribute.needsUpdate = true;

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
