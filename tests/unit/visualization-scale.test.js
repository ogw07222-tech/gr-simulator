import { describe, expect, it } from "vitest";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS } from "../../src/core/index.js";
import { SchwarzschildModel } from "../../src/physics/index.js";
import * as THREE from "three";
import { VolumetricGrid, normalizeAsinh, normalizeSpeed, writeGridDeformationColor, writeSpeedToWhiteColor } from "../../src/rendering/index.js";

const state = { ...SIMULATION_DEFAULTS };

describe("scientific visualization mappings", () => {
  it("maps asinh endpoints monotonically without changing raw inputs", () => {
    const values = [0, 0.001, 0.01, 0.1, 1];
    const mapped = values.map((value) => normalizeAsinh(value, 1));
    expect(mapped[0]).toBe(0);
    expect(mapped.at(-1)).toBe(1);
    for (let index = 1; index < mapped.length; index += 1) expect(mapped[index]).toBeGreaterThan(mapped[index - 1]);
    expect(values).toEqual([0, 0.001, 0.01, 0.1, 1]);
  });

  it("maps actual speed deterministically and monotonically", () => {
    expect(normalizeSpeed(0, 2)).toBe(0);
    expect(normalizeSpeed(1, 2)).toBe(0.5);
    expect(normalizeSpeed(2, 2)).toBe(1);
    expect(normalizeSpeed(4, 2)).toBe(1);
  });

  it("maps speed to monotonic brightness and white at the endpoint", () => {
    const colors = new Float32Array(9);
    writeSpeedToWhiteColor(colors, 0, 0);
    writeSpeedToWhiteColor(colors, 3, 0.5);
    writeSpeedToWhiteColor(colors, 6, 1);
    const luminance = (offset) => colors[offset] * 0.2126 + colors[offset + 1] * 0.7152 + colors[offset + 2] * 0.0722;
    expect(luminance(3)).toBeGreaterThan(luminance(0));
    expect(luminance(6)).toBeGreaterThan(luminance(3));
    expect(Array.from(colors.slice(6))).toEqual([1, 1, 1]);
    expect(Array.from(colors).every(Number.isFinite)).toBe(true);
  });

  it("maps deformation from blue through cyan to red", () => {
    const colors = new Float32Array(9);
    writeGridDeformationColor(colors, 0, 0);
    writeGridDeformationColor(colors, 3, 0.5);
    writeGridDeformationColor(colors, 6, 1);
    expect(colors[2]).toBeGreaterThan(colors[0]);
    expect(colors[4]).toBeGreaterThan(colors[3]);
    expect(colors[6]).toBeGreaterThan(colors[8]);
    expect(Array.from(colors).every(Number.isFinite)).toBe(true);
  });

  it("builds the approved finite domain with uniform spacing", () => {
    const grid = new VolumetricGrid({
      size: state.gridSize,
      spacing: state.gridSpacing,
    });
    expect(grid.basePositions[0]).toBe(-75);
    expect(grid.basePositions.at(-1)).toBe(75);
    expect(grid.nominalNearSpacing).toBe(5);
    expect(grid.segmentVertexCount).toBe(172980);
    expect(grid.topologyVertexCount).toBe(29791);
    expect(grid.object).toBeInstanceOf(THREE.Group);
    expect(grid.chunks).toHaveLength(64);
    expect(grid.chunks.reduce((sum, chunk) => sum + chunk.indices.length, 0)).toBe(grid.indices.length);
  });

  it("keeps complete topology and buffers unchanged while the camera moves", () => {
    const grid = new VolumetricGrid();
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    grid.update(model, state);
    const indices = grid.indices;
    const positions = grid.positions;
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    camera.position.set(22, 18, 22);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const diagnostics = grid.updateView(camera);
    camera.position.set(100, 100, 100);
    grid.updateView(camera);
    expect(diagnostics.visibleVertices).toBeGreaterThan(0);
    expect(diagnostics.visibleVertices).toBeLessThanOrEqual(diagnostics.renderCapacityVertices);
    expect(diagnostics.totalChunks).toBe(64);
    expect(grid.indices).toBe(indices);
    expect(grid.positions).toBe(positions);
    const recomputations = diagnostics.recomputations;
    const uploads = diagnostics.bufferUploads;
    expect(grid.update(model, state)).toBe(false);
    expect(diagnostics.recomputations).toBe(recomputations);
    expect(diagnostics.bufferUploads).toBe(uploads);
  });

  it("keeps configured grid opacity when the camera is at the mesh origin", () => {
    const grid = new VolumetricGrid();
    grid.setAppearance({ visible: true, opacity: 0.52, brightness: 0.82 });
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    camera.position.set(0, 0, 0);
    camera.lookAt(1, 0, 0);
    camera.updateProjectionMatrix();
    grid.updateView(camera);
    expect(grid.object.visible).toBe(true);
    expect(grid.material.opacity).toBe(0.52);
  });

  it("preserves finite raw model values independently of display extent", () => {
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    const grid = new VolumetricGrid({
      size: state.gridSize,
      spacing: state.gridSpacing,
    });
    grid.update(model, { ...state, maxDisplacement: 1 });
    const raw = Float64Array.from(grid.rawDisplacements);
    grid.update(model, { ...state, maxDisplacement: 4 });
    expect(Array.from(grid.rawDisplacements)).toEqual(Array.from(raw));
    expect([...grid.positions, ...grid.colors, ...grid.rawDisplacements].every(Number.isFinite)).toBe(true);
    expect(grid.getLegend().farFieldValue).toBeGreaterThan(0);
  });

  it("decreases toward the flat-space far-field limit", () => {
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    const radii = [20, 40, 80, 160];
    const values = radii.map((radius) => model.displacementMagnitude(state.mass, radius, state.warpScale));
    for (let index = 1; index < values.length; index += 1) expect(values[index]).toBeLessThan(values[index - 1]);
    expect(values.at(-1)).toBeLessThan(0.002);
  });

  it("handles event-horizon and unsupported inner-domain samples deterministically", () => {
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    const grid = new VolumetricGrid();
    grid.update(model, state);
    const center = Math.floor(grid.rawDisplacements.length / 2);
    const first = grid.rawDisplacements[center];
    grid.update(model, state);
    expect(grid.rawDisplacements[center]).toBe(first);
    expect(Number.isFinite(first)).toBe(true);
  });
});
