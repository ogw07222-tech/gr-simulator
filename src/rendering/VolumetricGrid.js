import * as THREE from "three";
import { GRID_ASINH_SOFTNESS, normalizeAsinh, writeBlueGreenColor } from "./VisualizationScale.js";

function createAdaptiveCoordinates(size, nearExtent, nearDivisions, farSpacingRatio) {
  const half = size / 2;
  const nearStep = (nearExtent * 2) / nearDivisions;
  const positive = [0];
  for (let value = nearStep; value <= nearExtent + Number.EPSILON; value += nearStep) positive.push(value);
  let spacing = nearStep * farSpacingRatio;
  let value = nearExtent + spacing;
  while (value < half) {
    positive.push(value);
    spacing *= farSpacingRatio;
    value += spacing;
  }
  if (positive[positive.length - 1] !== half) positive.push(half);

  const coordinates = new Float32Array(positive.length * 2 - 1);
  let target = 0;
  for (let index = positive.length - 1; index > 0; index -= 1) coordinates[target++] = -positive[index];
  for (let index = 0; index < positive.length; index += 1) coordinates[target++] = positive[index];
  return coordinates;
}

export class VolumetricGrid {
  constructor({ size = 240, divisions = 8, nearExtent = 12, farSpacingRatio = 1.5 } = {}) {
    this.size = size;
    this.divisions = divisions;
    this.nearExtent = nearExtent;
    this.farSpacingRatio = farSpacingRatio;
    this.coordinates = createAdaptiveCoordinates(size, nearExtent, divisions, farSpacingRatio);
    this.axisPointCount = this.coordinates.length;
    this.basePositions = new Float32Array(this.axisPointCount ** 3 * 3);
    this.rawDisplacements = new Float64Array(this.axisPointCount ** 3);
    this.displayValues = new Float32Array(this.axisPointCount ** 3);
    this.warpedPositions = new Float32Array(this.basePositions.length);
    this.indices = this.#buildTopology();
    this.positions = new Float32Array(this.indices.length * 3);
    this.colors = new Float32Array(this.indices.length * 3);
    this.legend = {
      rawMinimum: 0,
      rawMidpoint: 0,
      rawMaximum: 0,
      farFieldValue: 0,
      softness: GRID_ASINH_SOFTNESS,
    };

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
    const n = this.axisPointCount;
    const index = (x, y, z) => x * n * n + y * n + z;
    let vertexOffset = 0;
    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) {
        for (let z = 0; z < n; z += 1) {
          this.basePositions[vertexOffset++] = this.coordinates[x];
          this.basePositions[vertexOffset++] = this.coordinates[y];
          this.basePositions[vertexOffset++] = this.coordinates[z];
        }
      }
    }

    const indices = [];
    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) {
        for (let z = 0; z < n; z += 1) {
          const here = index(x, y, z);
          if (x < n - 1) indices.push(here, index(x + 1, y, z));
          if (y < n - 1) indices.push(here, index(x, y + 1, z));
          if (z < n - 1) indices.push(here, index(x, y, z + 1));
        }
      }
    }
    return new Uint32Array(indices);
  }

  update(model, { mass, w, mode, warpScale, maxDisplacement }) {
    const useW = mode === "GR_W";
    const schwarzschildRadius = model.schwarzschildRadius(mass);
    const boundaryRadius = Math.max(schwarzschildRadius, model.softening);
    const rawMaximum = model.displacementMagnitude(mass, boundaryRadius, warpScale);
    const scale = rawMaximum * GRID_ASINH_SOFTNESS;
    this.legend.rawMinimum = 0;
    this.legend.rawMaximum = rawMaximum;
    this.legend.rawMidpoint = rawMaximum > 0
      ? scale * Math.sinh(Math.asinh(rawMaximum / scale) * 0.5)
      : 0;

    const vertexCount = this.rawDisplacements.length;
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const offset = vertex * 3;
      const x = this.basePositions[offset];
      const y = this.basePositions[offset + 1];
      const z = this.basePositions[offset + 2];
      const radius = model.effectiveRadius(x, y, z, w, useW);
      const evaluationRadius = Math.max(radius, boundaryRadius);
      const raw = model.displacementMagnitude(mass, evaluationRadius, warpScale);
      const normalized = normalizeAsinh(raw, rawMaximum);
      this.rawDisplacements[vertex] = Number.isFinite(raw) ? raw : 0;
      this.displayValues[vertex] = normalized;

      const spatialRadius = Math.sqrt(x * x + y * y + z * z);
      const displayDisplacement = maxDisplacement * normalized;
      const ratio = spatialRadius > 0 ? displayDisplacement / spatialRadius : 0;
      this.warpedPositions[offset] = x * (1 - ratio);
      this.warpedPositions[offset + 1] = y * (1 - ratio);
      this.warpedPositions[offset + 2] = z * (1 - ratio);
    }

    const farVertex = vertexCount - 1;
    this.legend.farFieldValue = this.rawDisplacements[farVertex];
    const position = this.geometry.attributes.position;
    const color = this.geometry.attributes.color;
    for (let index = 0; index < this.indices.length; index += 1) {
      const vertex = this.indices[index];
      const source = vertex * 3;
      const target = index * 3;
      position.array[target] = this.warpedPositions[source];
      position.array[target + 1] = this.warpedPositions[source + 1];
      position.array[target + 2] = this.warpedPositions[source + 2];
      writeBlueGreenColor(color.array, target, this.displayValues[vertex]);
    }

    position.needsUpdate = true;
    color.needsUpdate = true;
  }

  get segmentVertexCount() { return this.indices.length; }
  get topologyVertexCount() { return this.rawDisplacements.length; }
  get nominalNearSpacing() { return (this.nearExtent * 2) / this.divisions; }
  get geometryMemoryBytes() { return this.basePositions.byteLength + this.rawDisplacements.byteLength + this.displayValues.byteLength + this.warpedPositions.byteLength + this.indices.byteLength + this.positions.byteLength + this.colors.byteLength; }
  getLegend() { return this.legend; }

  setAppearance({ visible, opacity, brightness }) {
    this.object.visible = visible;
    this.material.opacity = opacity;
    this.material.color.setRGB(brightness, brightness, brightness);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
