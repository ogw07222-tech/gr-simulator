import { describe, expect, it } from "vitest";
import {
  RenderScaleMode, RenderScaleTransform, calculatePhysicalSceneFit,
} from "../../src/rendering/index.js";
import { schwarzschildRadiusSI, solarMassesToKilograms } from "../../src/physics/index.js";
import { ParticleManager, SchwarzschildParticleSubsystem } from "../../src/systems/index.js";

describe("RenderScaleTransform", () => {
  it("maps normalized radii and the horizon identically", () => {
    const transform = new RenderScaleTransform();
    transform.setSchwarzschildRadiusMetres(12e9);
    expect(transform.horizonRenderRadius()).toBe(1);
    expect(transform.normalizedRadiusToRender(6)).toBe(6);
  });

  it("maps physical radii from SI without a factor-of-two error", () => {
    const radius = schwarzschildRadiusSI(solarMassesToKilograms(1));
    const transform = new RenderScaleTransform({ mode: RenderScaleMode.PHYSICAL, metresPerWorldUnit: 1e6 });
    transform.setSchwarzschildRadiusMetres(radius);
    expect(radius).toBeCloseTo(2953.339382066878, 9);
    expect(transform.horizonRenderRadius()).toBeCloseTo(radius / 1e6, 12);
  });

  it("doubles physical but not normalized horizon size when mass doubles", () => {
    const transform = new RenderScaleTransform({ mode: RenderScaleMode.PHYSICAL });
    transform.setSchwarzschildRadiusMetres(10e9);
    const first = transform.horizonRenderRadius();
    transform.setSchwarzschildRadiusMetres(20e9);
    expect(transform.horizonRenderRadius()).toBe(first * 2);
    transform.setMode(RenderScaleMode.NORMALIZED);
    expect(transform.horizonRenderRadius()).toBe(1);
  });

  it("writes Cartesian positions consistently without allocating a target", () => {
    const transform = new RenderScaleTransform({ mode: RenderScaleMode.PHYSICAL, metresPerWorldUnit: 2e9 });
    transform.setSchwarzschildRadiusMetres(10e9);
    const vector = { x: 0, y: 0, z: 0 };
    const array = new Float32Array(3);
    expect(transform.writeCartesian(vector, 2, -1, 3)).toBe(vector);
    expect(transform.writeArray(array, 0, 2, -1, 3)).toBe(array);
    expect(vector).toEqual({ x: 10, y: -5, z: 15 });
    expect([...array]).toEqual([10, -5, 15]);
    transform.writeCartesian(vector, Number.NaN, Infinity, -Infinity);
    expect(vector).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("rejects unsafe physical scales", () => {
    const transform = new RenderScaleTransform();
    expect(() => transform.setMetresPerWorldUnit(0)).toThrow(RangeError);
    expect(() => transform.setMetresPerWorldUnit(Number.NaN)).toThrow(RangeError);
  });

  it("switches presentation without mutating geodesic state or invoking integration", () => {
    const particles = new ParticleManager({ maxParticles: 1, maxTrailLength: 8 });
    const subsystem = new SchwarzschildParticleSubsystem({ particles });
    const transform = new RenderScaleTransform();
    const before = Array.from(subsystem.geodesic.state.values);
    const status = subsystem.geodesic.status;
    const classification = subsystem.geodesic.classification;
    transform.setSchwarzschildRadiusMetres(subsystem.units.lengthScale);
    transform.setMode(RenderScaleMode.PHYSICAL);
    transform.setMode(RenderScaleMode.AUTO_FIT_PHYSICAL);
    transform.setMode(RenderScaleMode.NORMALIZED);
    expect(Array.from(subsystem.geodesic.state.values)).toEqual(before);
    expect(subsystem.geodesic.status).toBe(status);
    expect(subsystem.geodesic.classification).toBe(classification);
    expect(subsystem.particle.trail.length).toBe(0);
  });
});

describe("physical scene fit", () => {
  it("contains the scene with its safety margin and finite clipping planes", () => {
    const result = { extent: 0, distance: 0, near: 0, far: 0 };
    expect(calculatePhysicalSceneFit(result, {
      sceneExtent: 12, safetyMargin: 1.25, verticalFovRadians: Math.PI / 3, aspect: 1.6,
    })).toBe(true);
    expect(result.extent).toBe(15);
    expect(result.distance).toBeGreaterThan(result.extent);
    expect(result.near).toBeGreaterThan(0);
    expect(result.far).toBeGreaterThan(result.distance + result.extent);
    expect(Number.isFinite(result.far)).toBe(true);
  });

  it("keeps clipping planes proportional at the smallest supported physical scale", () => {
    const result = {};
    expect(calculatePhysicalSceneFit(result, {
      sceneExtent: 1e-10, verticalFovRadians: Math.PI / 3, aspect: 16 / 9,
    })).toBe(true);
    expect(result.near).toBeGreaterThan(0);
    expect(result.near).toBeLessThan(result.extent);
    expect(result.far).toBeGreaterThan(result.distance + result.extent);
  });
});
