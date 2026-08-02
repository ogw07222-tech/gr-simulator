import * as THREE from "three";

export class VolumetricGrid {
  constructor({ size = 24, divisions = 12 } = {}) {
    this.size = size;
    this.divisions = divisions;
    this.baseVertices = [];
    this.indices = [];
    this.#buildTopology();

    this.positions = new Float32Array(this.indices.length * 3);
    this.colors = new Float32Array(this.indices.length * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });

    this.object = new THREE.LineSegments(this.geometry, this.material);
    this.object.frustumCulled = false;
  }

  #buildTopology() {
    const n = this.divisions;
    const step = this.size / n;
    const half = this.size / 2;
    const index = (x, y, z) => x * (n + 1) ** 2 + y * (n + 1) + z;

    for (let x = 0; x <= n; x += 1) {
      for (let y = 0; y <= n; y += 1) {
        for (let z = 0; z <= n; z += 1) {
          this.baseVertices.push(new THREE.Vector3(-half + x * step, -half + y * step, -half + z * step));
          const here = index(x, y, z);
          if (x < n) this.indices.push(here, index(x + 1, y, z));
          if (y < n) this.indices.push(here, index(x, y + 1, z));
          if (z < n) this.indices.push(here, index(x, y, z + 1));
        }
      }
    }
  }

  update(model, { mass, w, mode, warpScale, maxDisplacement }) {
    const useW = mode === "GR_W";
    const center = new THREE.Vector3();
    const warped = new Array(this.baseVertices.length);

    for (let i = 0; i < this.baseVertices.length; i += 1) {
      const base = this.baseVertices[i];
      const towardCenter = center.clone().sub(base);
      const radius = model.effectiveRadius(base.x, base.y, base.z, w, useW);
      const magnitude = Math.min(model.displacementMagnitude(mass, radius, warpScale), maxDisplacement);
      warped[i] = base.clone().add(towardCenter.normalize().multiplyScalar(magnitude));
    }

    const cold = new THREE.Color(0x27d7ff);
    const hot = new THREE.Color(0xff2f86);
    const position = this.geometry.attributes.position;
    const color = this.geometry.attributes.color;

    for (let i = 0; i < this.indices.length; i += 1) {
      const vertexIndex = this.indices[i];
      const p = warped[vertexIndex];
      const stress = Math.min(p.distanceTo(this.baseVertices[vertexIndex]) / maxDisplacement, 1);
      const tint = cold.clone().lerp(hot, stress);
      position.setXYZ(i, p.x, p.y, p.z);
      color.setXYZ(i, tint.r, tint.g, tint.b);
    }

    position.needsUpdate = true;
    color.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  get segmentVertexCount() { return this.indices.length; }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
