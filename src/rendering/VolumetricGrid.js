import * as THREE from "three";
import { GRID_ASINH_SOFTNESS, normalizeAsinh, writeGridDeformationColor } from "./VisualizationScale.js";

const HIGH_LOD_DISTANCE = 50;
const MIDDLE_LOD_DISTANCE = 110;
const LOD_HYSTERESIS = 5;

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

function smoothstep(inner, outer, value) {
  if (value <= inner) return 0;
  if (value >= outer) return 1;
  const normalized = (value - inner) / (outer - inner);
  return normalized * normalized * (3 - 2 * normalized);
}

export function normalizeNearFade(distance, outerDistance) {
  const outer = Math.max(1, outerDistance);
  return smoothstep(outer * 0.35, outer, Math.max(0, distance));
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
    this.object = new THREE.Group();
    this.object.name = "adaptive-grid-chunks";
    this.chunks = this.#buildChunks();
    this.material = this.chunks[0]?.material ?? null;
    this.visible = true;
    this.baseOpacity = 0.68;
    this.brightness = 1;
    this.maxRenderDistance = 140;
    this.nearFadeEnabled = true;
    this.nearFadeDistance = 10;
    this.viewProjection = new THREE.Matrix4();
    this.frustum = new THREE.Frustum();
    this.lastInputSignature = "";
    this.legend = { rawMinimum: 0, rawMidpoint: 0, rawMaximum: 0, farFieldValue: 0, softness: GRID_ASINH_SOFTNESS };
    this.diagnostics = {
      recomputations: 0,
      bufferUploads: 0,
      visibleChunks: 0,
      visibleVertices: 0,
      totalChunks: this.chunks.length,
      renderCapacityVertices: this.chunks.reduce((sum, chunk) => sum + chunk.highCount, 0),
    };
  }

  #buildTopology() {
    const n = this.axisPointCount;
    const vertexIndex = (x, y, z) => x * n * n + y * n + z;
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
          const here = vertexIndex(x, y, z);
          if (x < n - 1) indices.push(here, vertexIndex(x + 1, y, z));
          if (y < n - 1) indices.push(here, vertexIndex(x, y + 1, z));
          if (z < n - 1) indices.push(here, vertexIndex(x, y, z + 1));
        }
      }
    }
    return new Uint32Array(indices);
  }

  #buildChunks() {
    const buckets = new Map();
    for (let offset = 0; offset < this.indices.length; offset += 2) {
      const first = this.indices[offset];
      const second = this.indices[offset + 1];
      const a = first * 3;
      const b = second * 3;
      const x = (this.basePositions[a] + this.basePositions[b]) * 0.5;
      const y = (this.basePositions[a + 1] + this.basePositions[b + 1]) * 0.5;
      const z = (this.basePositions[a + 2] + this.basePositions[b + 2]) * 0.5;
      const radialBand = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      const region = radialBand <= this.nearExtent ? "near" : radialBand <= this.size / 4 ? "middle" : "far";
      const octant = (x >= 0 ? 4 : 0) | (y >= 0 ? 2 : 0) | (z >= 0 ? 1 : 0);
      const key = `${region}-${octant}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { key, region, low: [], middle: [], high: [] };
        buckets.set(key, bucket);
      }
      const segment = offset / 2;
      const tier = segment % 4 === 0 ? bucket.low : segment % 2 === 0 ? bucket.middle : bucket.high;
      tier.push(first, second);
    }

    const chunks = [];
    for (const bucket of buckets.values()) {
      const sourceIndices = new Uint32Array([...bucket.low, ...bucket.middle, ...bucket.high]);
      const positions = new Float32Array(sourceIndices.length * 3);
      const colors = new Float32Array(sourceIndices.length * 3);
      for (let index = 0; index < sourceIndices.length; index += 1) {
        const source = sourceIndices[index] * 3;
        const target = index * 3;
        positions[target] = this.basePositions[source];
        positions[target + 1] = this.basePositions[source + 1];
        positions[target + 2] = this.basePositions[source + 2];
        writeGridDeformationColor(colors, target, 0);
      }
      const geometry = new THREE.BufferGeometry();
      const positionAttribute = new THREE.BufferAttribute(positions, 3);
      const colorAttribute = new THREE.BufferAttribute(colors, 3);
      positionAttribute.setUsage(THREE.DynamicDrawUsage);
      colorAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("position", positionAttribute);
      geometry.setAttribute("color", colorAttribute);
      geometry.computeBoundingBox();
      geometry.boundingBox.expandByScalar(4);
      geometry.computeBoundingSphere();
      const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false });
      const line = new THREE.LineSegments(geometry, material);
      line.name = `grid-${bucket.key}`;
      line.frustumCulled = true;
      const chunk = {
        key: bucket.key,
        region: bucket.region,
        sourceIndices,
        positions,
        colors,
        geometry,
        positionAttribute,
        colorAttribute,
        material,
        line,
        box: geometry.boundingBox,
        center: geometry.boundingBox.getCenter(new THREE.Vector3()),
        lowCount: bucket.low.length,
        middleCount: bucket.low.length + bucket.middle.length,
        highCount: sourceIndices.length,
        lod: "high",
        visible: true,
      };
      geometry.setDrawRange(0, chunk.highCount);
      this.object.add(line);
      chunks.push(chunk);
    }
    return chunks;
  }

  update(model, { mass, w, mode, warpScale, maxDisplacement }) {
    const signature = `${mass}|${w}|${mode}|${warpScale}|${maxDisplacement}`;
    if (signature === this.lastInputSignature) return false;
    this.lastInputSignature = signature;
    const useW = mode === "GR_W";
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
      const radius = model.effectiveRadius(x, y, z, w, useW);
      const raw = model.displacementMagnitude(mass, Math.max(radius, boundaryRadius), warpScale);
      const normalized = normalizeAsinh(raw, rawMaximum);
      this.rawDisplacements[vertex] = Number.isFinite(raw) ? raw : 0;
      this.displayValues[vertex] = normalized;
      const spatialRadius = Math.sqrt(x * x + y * y + z * z);
      const ratio = spatialRadius > 0 ? maxDisplacement * normalized / spatialRadius : 0;
      this.warpedPositions[offset] = x * (1 - ratio);
      this.warpedPositions[offset + 1] = y * (1 - ratio);
      this.warpedPositions[offset + 2] = z * (1 - ratio);
    }

    this.legend.farFieldValue = this.rawDisplacements[this.rawDisplacements.length - 1];
    for (let index = 0; index < this.indices.length; index += 1) {
      const vertex = this.indices[index];
      const source = vertex * 3;
      const target = index * 3;
      this.positions[target] = this.warpedPositions[source];
      this.positions[target + 1] = this.warpedPositions[source + 1];
      this.positions[target + 2] = this.warpedPositions[source + 2];
      writeGridDeformationColor(this.colors, target, this.displayValues[vertex]);
    }
    for (let chunkIndex = 0; chunkIndex < this.chunks.length; chunkIndex += 1) {
      const chunk = this.chunks[chunkIndex];
      for (let index = 0; index < chunk.sourceIndices.length; index += 1) {
        const vertex = chunk.sourceIndices[index];
        const source = vertex * 3;
        const target = index * 3;
        chunk.positions[target] = this.warpedPositions[source];
        chunk.positions[target + 1] = this.warpedPositions[source + 1];
        chunk.positions[target + 2] = this.warpedPositions[source + 2];
        writeGridDeformationColor(chunk.colors, target, this.displayValues[vertex]);
      }
      chunk.positionAttribute.needsUpdate = true;
      chunk.colorAttribute.needsUpdate = true;
    }
    this.diagnostics.recomputations += 1;
    this.diagnostics.bufferUploads += this.chunks.length * 2;
    return true;
  }

  updateView(camera) {
    camera.updateMatrixWorld();
    this.object.updateMatrixWorld();
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.viewProjection);
    let visibleChunks = 0;
    let visibleVertices = 0;
    for (let index = 0; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index];
      const distance = chunk.center.distanceTo(camera.position);
      const fadeDistance = chunk.box.distanceToPoint(camera.position);
      const limit = this.maxRenderDistance + (chunk.visible ? LOD_HYSTERESIS : -LOD_HYSTERESIS);
      const fade = this.nearFadeEnabled ? normalizeNearFade(fadeDistance, this.nearFadeDistance) : 1;
      chunk.visible = this.visible && distance <= limit && fade > 0.01 && this.frustum.intersectsObject(chunk.line);
      chunk.line.visible = chunk.visible;
      chunk.material.opacity = this.baseOpacity * fade;
      if (!chunk.visible) continue;
      if (chunk.lod === "high" && distance > HIGH_LOD_DISTANCE + LOD_HYSTERESIS) chunk.lod = "middle";
      else if (chunk.lod === "middle" && distance < HIGH_LOD_DISTANCE - LOD_HYSTERESIS) chunk.lod = "high";
      else if (chunk.lod === "middle" && distance > MIDDLE_LOD_DISTANCE + LOD_HYSTERESIS) chunk.lod = "low";
      else if (chunk.lod === "low" && distance < MIDDLE_LOD_DISTANCE - LOD_HYSTERESIS) chunk.lod = "middle";
      const count = chunk.lod === "high" ? chunk.highCount : chunk.lod === "middle" ? chunk.middleCount : chunk.lowCount;
      chunk.geometry.setDrawRange(0, count);
      visibleChunks += 1;
      visibleVertices += count;
    }
    this.diagnostics.visibleChunks = visibleChunks;
    this.diagnostics.visibleVertices = visibleVertices;
    return this.diagnostics;
  }

  setViewSettings({ maxRenderDistance, nearFadeEnabled, nearFadeDistance }) {
    if (Number.isFinite(maxRenderDistance)) this.maxRenderDistance = Math.max(20, maxRenderDistance);
    if (typeof nearFadeEnabled === "boolean") this.nearFadeEnabled = nearFadeEnabled;
    if (Number.isFinite(nearFadeDistance)) this.nearFadeDistance = Math.max(1, nearFadeDistance);
  }

  get segmentVertexCount() { return this.indices.length; }
  get topologyVertexCount() { return this.rawDisplacements.length; }
  get nominalNearSpacing() { return (this.nearExtent * 2) / this.divisions; }
  get geometryMemoryBytes() {
    let bytes = this.basePositions.byteLength + this.rawDisplacements.byteLength + this.displayValues.byteLength + this.warpedPositions.byteLength + this.indices.byteLength + this.positions.byteLength + this.colors.byteLength;
    for (let index = 0; index < this.chunks.length; index += 1) bytes += this.chunks[index].sourceIndices.byteLength + this.chunks[index].positions.byteLength + this.chunks[index].colors.byteLength;
    return bytes;
  }
  getLegend() { return this.legend; }
  getDiagnostics() { return this.diagnostics; }

  setAppearance({ visible, opacity, brightness }) {
    this.visible = visible;
    this.baseOpacity = opacity;
    this.brightness = brightness;
    for (let index = 0; index < this.chunks.length; index += 1) {
      this.chunks[index].material.color.setRGB(brightness, brightness, brightness);
    }
  }

  dispose() {
    for (let index = 0; index < this.chunks.length; index += 1) {
      this.chunks[index].geometry.dispose();
      this.chunks[index].material.dispose();
    }
  }
}
