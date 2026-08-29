import * as THREE from "three";
import { GRID_ASINH_SOFTNESS, normalizeAsinh, writeGridDeformationColor } from "./VisualizationScale.js";

export class VolumetricGrid {
  constructor({ size = 150, spacing = 5, chunkDivisions = 4 } = {}) {
    if (!Number.isFinite(size) || size <= 0) throw new RangeError("Grid size must be positive and finite.");
    if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError("Grid spacing must be positive and finite.");
    if (!Number.isInteger(chunkDivisions) || chunkDivisions < 1) throw new RangeError("Grid chunk divisions must be a positive integer.");
    const intervals = Math.round(size / spacing);
    if (Math.abs(intervals * spacing - size) > Number.EPSILON * size) {
      throw new RangeError("Grid size must be an integer multiple of spacing.");
    }

    this.size = size;
    this.spacing = spacing;
    this.chunkDivisions = chunkDivisions;
    this.halfExtent = size / 2;
    this.axisPointCount = intervals + 1;
    this.basePositions = new Float32Array(this.axisPointCount ** 3 * 3);
    this.rawDisplacements = new Float64Array(this.axisPointCount ** 3);
    this.displayValues = new Float32Array(this.axisPointCount ** 3);
    this.positions = new Float32Array(this.basePositions.length);
    this.colors = new Float32Array(this.basePositions.length);
    this.#buildPositions();
    this.indices = this.#buildTopology();

    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false });
    this.object = new THREE.Group();
    this.object.name = "uniform-supported-domain-grid";
    this.chunks = this.#buildChunks();
    this.viewProjection = new THREE.Matrix4();
    this.frustum = new THREE.Frustum();

    this.visible = true;
    this.brightness = 1;
    this.lastInputSignature = "";
    this.legend = { rawMinimum: 0, rawMidpoint: 0, rawMaximum: 0, farFieldValue: 0, softness: GRID_ASINH_SOFTNESS };
    this.diagnostics = {
      recomputations: 0,
      bufferUploads: 0,
      visibleChunks: this.chunks.length,
      visibleVertices: this.indices.length,
      totalChunks: this.chunks.length,
      renderCapacityVertices: this.indices.length,
    };
  }

  #buildPositions() {
    const n = this.axisPointCount;
    let offset = 0;
    for (let x = 0; x < n; x += 1) {
      const px = -this.halfExtent + x * this.spacing;
      for (let y = 0; y < n; y += 1) {
        const py = -this.halfExtent + y * this.spacing;
        for (let z = 0; z < n; z += 1) {
          this.basePositions[offset] = px;
          this.basePositions[offset + 1] = py;
          this.basePositions[offset + 2] = -this.halfExtent + z * this.spacing;
          this.positions[offset] = this.basePositions[offset];
          this.positions[offset + 1] = this.basePositions[offset + 1];
          this.positions[offset + 2] = this.basePositions[offset + 2];
          writeGridDeformationColor(this.colors, offset, 0);
          offset += 3;
        }
      }
    }
  }

  #buildTopology() {
    const n = this.axisPointCount;
    const vertexIndex = (x, y, z) => x * n * n + y * n + z;
    const indices = new Uint32Array(6 * (n - 1) * n * n);
    let offset = 0;
    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) {
        for (let z = 0; z < n; z += 1) {
          const here = vertexIndex(x, y, z);
          if (x < n - 1) { indices[offset++] = here; indices[offset++] = vertexIndex(x + 1, y, z); }
          if (y < n - 1) { indices[offset++] = here; indices[offset++] = vertexIndex(x, y + 1, z); }
          if (z < n - 1) { indices[offset++] = here; indices[offset++] = vertexIndex(x, y, z + 1); }
        }
      }
    }
    return indices;
  }

  #buildChunks() {
    const count = this.chunkDivisions ** 3;
    const buckets = Array.from({ length: count }, () => []);
    const chunkSize = this.size / this.chunkDivisions;
    for (let offset = 0; offset < this.indices.length; offset += 2) {
      const first = this.indices[offset];
      const second = this.indices[offset + 1];
      const a = first * 3;
      const b = second * 3;
      const x = (this.basePositions[a] + this.basePositions[b]) * 0.5;
      const y = (this.basePositions[a + 1] + this.basePositions[b + 1]) * 0.5;
      const z = (this.basePositions[a + 2] + this.basePositions[b + 2]) * 0.5;
      const ix = Math.min(this.chunkDivisions - 1, Math.floor((x + this.halfExtent) / chunkSize));
      const iy = Math.min(this.chunkDivisions - 1, Math.floor((y + this.halfExtent) / chunkSize));
      const iz = Math.min(this.chunkDivisions - 1, Math.floor((z + this.halfExtent) / chunkSize));
      buckets[(ix * this.chunkDivisions + iy) * this.chunkDivisions + iz].push(first, second);
    }

    const chunks = [];
    for (let index = 0; index < buckets.length; index += 1) {
      if (buckets[index].length === 0) continue;
      const ix = Math.floor(index / (this.chunkDivisions * this.chunkDivisions));
      const remainder = index % (this.chunkDivisions * this.chunkDivisions);
      const iy = Math.floor(remainder / this.chunkDivisions);
      const iz = remainder % this.chunkDivisions;
      const minimum = new THREE.Vector3(
        -this.halfExtent + ix * chunkSize - this.spacing,
        -this.halfExtent + iy * chunkSize - this.spacing,
        -this.halfExtent + iz * chunkSize - this.spacing,
      );
      const maximum = new THREE.Vector3(
        -this.halfExtent + (ix + 1) * chunkSize + this.spacing,
        -this.halfExtent + (iy + 1) * chunkSize + this.spacing,
        -this.halfExtent + (iz + 1) * chunkSize + this.spacing,
      );
      const box = new THREE.Box3(minimum, maximum);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", this.positionAttribute);
      geometry.setAttribute("color", this.colorAttribute);
      const chunkIndices = new Uint32Array(buckets[index]);
      geometry.setIndex(new THREE.BufferAttribute(chunkIndices, 1));
      geometry.boundingBox = box;
      geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      const line = new THREE.LineSegments(geometry, this.material);
      line.name = `uniform-grid-${ix}-${iy}-${iz}`;
      line.frustumCulled = true;
      this.object.add(line);
      chunks.push({ geometry, indices: chunkIndices, line, box, minimum: minimum.clone(), maximum: maximum.clone() });
    }
    return chunks;
  }

  update(model, {
    warpScale, maxDisplacement, massSolar = 0, renderScale = 1, visualDeformationGain = 1,
  }) {
    const signature = `${warpScale}|${maxDisplacement}|${massSolar}|${renderScale}|${visualDeformationGain}`;
    if (signature === this.lastInputSignature) return false;
    this.lastInputSignature = signature;
    // The grid is expressed in Schwarzschild-normalized display coordinates: r_s = 1.
    const mass = model.c * model.c / (2 * model.G);
    const schwarzschildRadius = model.schwarzschildRadius(mass);
    const boundaryRadius = Math.max(schwarzschildRadius, model.softening);
    const rawMaximum = model.displacementMagnitude(mass, boundaryRadius, warpScale);
    const scale = rawMaximum * GRID_ASINH_SOFTNESS;
    this.legend.rawMinimum = 0;
    this.legend.rawMaximum = rawMaximum;
    this.legend.rawMidpoint = rawMaximum > 0 ? scale * Math.sinh(Math.asinh(rawMaximum / scale) * 0.5) : 0;

    for (let vertex = 0; vertex < this.rawDisplacements.length; vertex += 1) {
      const offset = vertex * 3;
      const x = this.basePositions[offset];
      const y = this.basePositions[offset + 1];
      const z = this.basePositions[offset + 2];
      const radius = model.spatialRadius(x, y, z);
      const softenedRadius = Math.sqrt(radius * radius + model.softening ** 2);
      const raw = model.displacementMagnitude(mass, Math.max(softenedRadius, boundaryRadius), warpScale);
      const normalized = normalizeAsinh(raw, rawMaximum);
      this.rawDisplacements[vertex] = Number.isFinite(raw) ? raw : 0;
      this.displayValues[vertex] = normalized;
      const ratio = radius > 0 ? maxDisplacement * visualDeformationGain * normalized / radius : 0;
      this.positions[offset] = x * (1 - ratio) * renderScale;
      this.positions[offset + 1] = y * (1 - ratio) * renderScale;
      this.positions[offset + 2] = z * (1 - ratio) * renderScale;
      writeGridDeformationColor(this.colors, offset, normalized);
    }

    this.legend.farFieldValue = this.rawDisplacements[this.rawDisplacements.length - 1];
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    for (let index = 0; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index];
      chunk.box.min.copy(chunk.minimum).multiplyScalar(renderScale);
      chunk.box.max.copy(chunk.maximum).multiplyScalar(renderScale);
      chunk.box.getBoundingSphere(chunk.geometry.boundingSphere);
    }
    this.diagnostics.recomputations += 1;
    this.diagnostics.bufferUploads += 2;
    const center = Math.floor(this.rawDisplacements.length / 2);
    this.diagnostics.centralRawDeformation = this.rawDisplacements[center];
    this.diagnostics.centralDisplayDeformation = this.displayValues[center];
    this.diagnostics.appliedMassSolar = massSolar;
    this.diagnostics.renderScale = renderScale;
    this.diagnostics.visualDeformationGain = visualDeformationGain;
    return true;
  }

  updateView(camera) {
    camera.updateMatrixWorld();
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProjection);
    this.object.visible = this.visible;
    let visibleChunks = 0;
    let visibleVertices = 0;
    for (let index = 0; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index];
      chunk.line.visible = this.object.visible && this.frustum.intersectsBox(chunk.box);
      if (!chunk.line.visible) continue;
      visibleChunks += 1;
      visibleVertices += chunk.indices.length;
    }
    this.diagnostics.visibleChunks = visibleChunks;
    this.diagnostics.visibleVertices = visibleVertices;
    return this.diagnostics;
  }

  get segmentVertexCount() { return this.indices.length; }
  get topologyVertexCount() { return this.rawDisplacements.length; }
  get nominalNearSpacing() { return this.spacing; }
  get geometryMemoryBytes() {
    let bytes = this.basePositions.byteLength + this.rawDisplacements.byteLength + this.displayValues.byteLength
      + this.positions.byteLength + this.colors.byteLength + this.indices.byteLength;
    for (let index = 0; index < this.chunks.length; index += 1) bytes += this.chunks[index].indices.byteLength;
    return bytes;
  }
  getLegend() { return this.legend; }
  getDiagnostics() { return this.diagnostics; }

  setAppearance({ visible, opacity, brightness }) {
    this.visible = visible;
    this.material.opacity = opacity;
    this.brightness = brightness;
    this.material.color.setRGB(brightness, brightness, brightness);
  }

  dispose() {
    for (let index = 0; index < this.chunks.length; index += 1) this.chunks[index].geometry.dispose();
    this.material.dispose();
  }
}
