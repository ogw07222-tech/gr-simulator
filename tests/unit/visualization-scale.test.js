import { describe, expect, it, vi } from "vitest";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS } from "../../src/core/index.js";
import { SchwarzschildModel } from "../../src/physics/index.js";
import * as THREE from "three";
import { Renderer, VolumetricGrid, normalizeAsinh, normalizeSpeed, writeGridDeformationColor, writeSpeedToWhiteColor } from "../../src/rendering/index.js";

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

  it("uses ordinary 3D spatial distance with bounded recomputation", () => {
    const grid = new VolumetricGrid();
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    expect(model.spatialRadius(3, 4, 12)).toBe(13);
    expect(grid.update(model, state)).toBe(true);
    const recomputations = grid.getDiagnostics().recomputations;
    expect(grid.update(model, state)).toBe(false);
    expect(grid.getDiagnostics().recomputations).toBe(recomputations);
  });

  it("invalidates once for applied mass or physical scale and preserves normalized shape", () => {
    const grid = new VolumetricGrid();
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    const first = { ...state, massSolar: 4e6, renderScale: 1 };
    grid.update(model, first);
    const normalizedPositions = Float32Array.from(grid.positions);
    const recomputations = grid.getDiagnostics().recomputations;
    expect(grid.update(model, { ...first, massSolar: 8e6 })).toBe(true);
    expect(grid.getDiagnostics().recomputations).toBe(recomputations + 1);
    expect(grid.positions).toEqual(normalizedPositions);
    expect(grid.update(model, { ...first, massSolar: 8e6 })).toBe(false);
    expect(grid.update(model, { ...first, massSolar: 8e6, renderScale: 2 })).toBe(true);
    expect(grid.positions[0]).toBeCloseTo(normalizedPositions[0] * 2, 5);
    expect(grid.getDiagnostics()).toMatchObject({ appliedMassSolar: 8e6, renderScale: 2 });
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
    const normalizedMass = model.c * model.c / (2 * model.G);
    const values = radii.map((radius) => model.displacementMagnitude(normalizedMass, radius, state.warpScale));
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

describe("particle camera tracking", () => {
  function createCameraController() {
    const renderer = Object.create(Renderer.prototype);
    renderer.camera = { position: new THREE.Vector3(10, 5, 2) };
    renderer.controls = { target: new THREE.Vector3(), update() {} };
    renderer.initialCameraPosition = renderer.camera.position.clone();
    renderer.trackingOffset = new THREE.Vector3();
    renderer.trackingPosition = new THREE.Vector3();
    renderer.trackingDelta = new THREE.Vector3();
    renderer.followingParticle = false;
    return renderer;
  }

  it("focuses on final render coordinates without changing the supplied snapshot", () => {
    const renderer = createCameraController();
    const snapshot = Object.freeze({ renderX: 3, renderY: 4, renderZ: 5, radiusRs: 6 });
    expect(renderer.focusPoint(snapshot.renderX, snapshot.renderY, snapshot.renderZ)).toBe(true);
    expect(renderer.controls.target.toArray()).toEqual([3, 4, 5]);
    expect(snapshot.radiusRs).toBe(6);
    expect(renderer.focusPoint(Number.NaN, 0, 0)).toBe(false);
  });

  it("applies deformation gain only to grid-line displacement", () => {
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    const grid = new VolumetricGrid();
    grid.update(model, { ...state, visualDeformationGain: 1 });
    const base = Float32Array.from(grid.basePositions);
    const gainOne = Float32Array.from(grid.positions);
    const raw = Float64Array.from(grid.rawDisplacements);
    const colors = Float32Array.from(grid.colors);
    expect(grid.update(model, { ...state, visualDeformationGain: 1 })).toBe(false);
    for (const gain of [2, 5]) {
      grid.update(model, { ...state, visualDeformationGain: gain });
      for (let index = 0; index < gainOne.length; index += 997) {
        expect(grid.positions[index] - base[index]).toBeCloseTo((gainOne[index] - base[index]) * gain, 4);
      }
      expect(grid.rawDisplacements).toEqual(raw);
      expect(grid.colors).toEqual(colors);
    }
    expect(grid.getDiagnostics().visualDeformationGain).toBe(5);
  });

  it("translates camera and target equally, supports scale jumps, and stops when disabled", () => {
    const renderer = createCameraController();
    const initialOffset = renderer.camera.position.clone().sub(renderer.controls.target);
    expect(renderer.setParticleFollow(true, 2, 0, 0)).toBe(true);
    expect(renderer.updateParticleFollow(4, 3, 1)).toBe(true);
    expect(renderer.controls.target.toArray()).toEqual([2, 3, 1]);
    expect(renderer.camera.position.clone().sub(renderer.controls.target).toArray()).toEqual(initialOffset.toArray());
    expect(renderer.updateParticleFollow(40, 30, 10)).toBe(true);
    renderer.controls.target.set(0, 0, 0);
    renderer.camera.position.set(20, 10, 4);
    expect(renderer.rebaseParticleFollow(80, 60, 20)).toBe(true);
    expect(renderer.controls.target.toArray()).toEqual([80, 60, 20]);
    expect(renderer.camera.position.clone().sub(renderer.controls.target).toArray()).toEqual([20, 10, 4]);
    const stoppedPosition = renderer.camera.position.clone();
    renderer.setParticleFollow(false);
    expect(renderer.updateParticleFollow(50, 50, 50)).toBe(false);
    expect(renderer.camera.position.toArray()).toEqual(stoppedPosition.toArray());
    expect(renderer.setParticleFollow(true, Infinity, 0, 0)).toBe(false);
  });

  it("scales fog with presentation coordinates and refits only unsafe camera states", () => {
    const renderer = createCameraController();
    renderer.baseFogDensity = 0.018;
    renderer.scene = { fog: { density: 0.018 } };
    renderer.camera.near = 0.1;
    renderer.camera.far = 500;
    renderer.fitPhysicalScene = vi.fn(() => true);
    expect(renderer.updatePresentationScale(12)).toBe(true);
    expect(renderer.scene.fog.density).toBeCloseTo(0.0015, 12);
    expect(renderer.ensureSceneVisible(6, 1)).toBe(false);
    renderer.camera.position.set(0.01, 0, 0);
    expect(renderer.ensureSceneVisible(6, 1)).toBe(true);
    expect(renderer.fitPhysicalScene).toHaveBeenCalledWith(6, 1.25);
    renderer.camera.position.set(Number.NaN, 0, 0);
    expect(renderer.ensureSceneVisible(6, 1)).toBe(true);
  });
});
