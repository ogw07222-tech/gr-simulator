import { describe, expect, it } from "vitest";
import { SchwarzschildModel } from "../../src/physics/schwarzschild.js";

const model = new SchwarzschildModel({ G: 1, c: 10, softening: 0.5 });

describe("SchwarzschildModel", () => {
  it("calculates the Schwarzschild radius", () => {
    expect(model.schwarzschildRadius(100)).toBe(2);
  });

  it("clamps negative mass when calculating the radius", () => {
    expect(model.schwarzschildRadius(-100)).toBe(0);
  });

  it("calculates ordinary three-dimensional spatial radius", () => {
    expect(model.spatialRadius(3, 4, 12)).toBe(13);
    expect(model.spatialRadius(0, 0, 0)).toBe(0);
  });

  it("calculates lapse outside the event horizon", () => {
    expect(model.lapse(100, 8)).toBeCloseTo(Math.sqrt(0.75));
  });

  it("clamps lapse at and inside the event horizon", () => {
    expect(model.lapse(100, 2)).toBe(0);
    expect(model.lapse(100, 1)).toBe(0);
  });

  it("calculates the curvature proxy", () => {
    expect(model.curvatureProxy(100, 4)).toBeCloseTo(0.5);
  });

  it("uses softening as the curvature radius floor", () => {
    expect(model.curvatureProxy(100, 0.1)).toBeCloseTo(4);
  });

  it("calculates displacement magnitude", () => {
    expect(model.displacementMagnitude(100, 2, 12)).toBeCloseTo(6);
  });

  it("uses the squared softening floor for displacement", () => {
    expect(model.displacementMagnitude(100, 0.1, 12)).toBeCloseTo(96);
  });
});
