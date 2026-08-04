import { describe, expect, it } from "vitest";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS } from "../../src/core/index.js";
import { SchwarzschildModel } from "../../src/physics/index.js";
import { VolumetricGrid, normalizeAsinh, normalizeSpeed } from "../../src/rendering/index.js";

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

  it("builds a ten-times-wider adaptive grid with bounded topology", () => {
    const grid = new VolumetricGrid({
      size: state.gridSize,
      divisions: state.gridDivisions,
      nearExtent: state.gridNearExtent,
      farSpacingRatio: state.gridFarSpacingRatio,
    });
    expect(grid.coordinates[0]).toBe(-120);
    expect(grid.coordinates.at(-1)).toBe(120);
    expect(grid.nominalNearSpacing).toBe(3);
    expect(grid.segmentVertexCount).toBe(69828);
    expect(grid.topologyVertexCount).toBe(12167);
    expect(grid.segmentVertexCount).toBeLessThan(70000);
  });

  it("preserves finite raw model values independently of display extent", () => {
    const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
    const grid = new VolumetricGrid({
      size: state.gridSize,
      divisions: state.gridDivisions,
      nearExtent: state.gridNearExtent,
      farSpacingRatio: state.gridFarSpacingRatio,
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
