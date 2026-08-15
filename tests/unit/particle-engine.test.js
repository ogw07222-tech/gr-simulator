import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
  ParticleManager,
  ParticleRenderer,
  ParticleState,
  ParticleTrail,
} from "../../src/systems/particles/index.js";
import { RenderScaleMode, RenderScaleTransform } from "../../src/rendering/index.js";

describe("ParticleManager", () => {
  it("creates a particle with the complete data model", () => {
    const manager = new ParticleManager({ maxParticles: 4, maxTrailLength: 8 });
    const particle = manager.create({
      id: "probe",
      position: [1, 2, 3],
      velocity: { x: 4, y: 5, z: 6 },
      acceleration: [0.1, 0.2, 0.3],
      restMass: 2,
      properTime: 3,
      coordinateTime: 4,
      energy: 5,
      angularMomentum: [6, 7, 8],
      radius: 0.5,
      color: 0xff0088,
      state: ParticleState.MOVING,
      userData: { source: "test" },
    });

    expect(particle.id).toBe("probe");
    expect(particle.position).toBeInstanceOf(THREE.Vector3);
    expect(particle.position.toArray()).toEqual([1, 2, 3]);
    expect(particle.velocity.toArray()).toEqual([4, 5, 6]);
    expect(particle.acceleration.toArray()).toEqual([0.1, 0.2, 0.3]);
    expect(particle.restMass).toBe(2);
    expect(particle.properTime).toBe(3);
    expect(particle.coordinateTime).toBe(4);
    expect(particle.energy).toBe(5);
    expect(particle.angularMomentum.toArray()).toEqual([6, 7, 8]);
    expect(particle.radius).toBe(0.5);
    expect(particle.color).toBeInstanceOf(THREE.Color);
    expect(particle.alive).toBe(true);
    expect(particle.state).toBe(ParticleState.MOVING);
    expect(particle.trail).toBeInstanceOf(ParticleTrail);
    expect(particle.userData.source).toBe("test");
    expect(manager.count()).toBe(1);
    expect(manager.findById("probe")).toBe(particle);
  });

  it("destroys and recycles a particle slot", () => {
    const manager = new ParticleManager({ maxParticles: 1 });
    const first = manager.create({ id: 1 });

    expect(manager.destroy(1)).toBe(true);
    expect(manager.destroy(1)).toBe(false);
    expect(first.alive).toBe(false);
    expect(manager.findById(1)).toBeNull();
    expect(manager.count()).toBe(0);

    const second = manager.create({ id: 2 });
    expect(second).toBe(first);
  });

  it("resets a particle to its spawn state without replacing owned vectors", () => {
    const manager = new ParticleManager();
    const particle = manager.create({
      id: 1,
      position: [1, 2, 3],
      velocity: [4, 0, 0],
      coordinateTime: 7,
      userData: { label: "initial" },
    });
    const position = particle.position;
    manager.update(0.5);
    particle.userData.label = "changed";

    expect(manager.reset(1)).toBe(true);
    expect(particle.position).toBe(position);
    expect(particle.position.toArray()).toEqual([1, 2, 3]);
    expect(particle.coordinateTime).toBe(7);
    expect(particle.userData.label).toBe("initial");
    expect(particle.trail.length).toBe(0);
  });

  it("resets all active particles", () => {
    const manager = new ParticleManager();
    const particles = manager.spawnBatch([
      { position: [1, 0, 0], velocity: [1, 0, 0] },
      { position: [2, 0, 0], velocity: [1, 0, 0] },
    ]);
    manager.update(1);

    manager.reset();

    expect(particles[0].position.x).toBe(1);
    expect(particles[1].position.x).toBe(2);
  });

  it("spawns a batch atomically within capacity", () => {
    const manager = new ParticleManager({ maxParticles: 3 });
    const particles = manager.spawnBatch([{ id: "a" }, { id: "b" }, { id: "c" }]);

    expect(particles).toHaveLength(3);
    expect(manager.count()).toBe(3);
    expect(manager.findById("b")).toBe(particles[1]);
  });

  it("rolls back a failed batch", () => {
    const manager = new ParticleManager({ maxParticles: 3 });

    expect(() => manager.spawnBatch([{ id: "duplicate" }, { id: "duplicate" }])).toThrow("already exists");
    expect(manager.count()).toBe(0);
  });

  it("enforces maximum particle capacity", () => {
    const manager = new ParticleManager({ maxParticles: 1 });
    manager.create();

    expect(() => manager.create()).toThrow("Maximum particle count");
    expect(() => manager.spawnBatch([{}])).toThrow("remaining particle capacity");
  });

  it("updates kinematics and coordinate time without changing proper time or classification", () => {
    const manager = new ParticleManager();
    const particle = manager.create({
      position: [0, 0, 0],
      velocity: [1, 0, 0],
      acceleration: [1, 0, 0],
      properTime: 5,
      state: ParticleState.IDLE,
    });

    manager.update(0.5);

    expect(particle.velocity.x).toBe(1.5);
    expect(particle.position.x).toBe(0.75);
    expect(particle.coordinateTime).toBe(0.5);
    expect(particle.properTime).toBe(5);
    expect(particle.state).toBe(ParticleState.IDLE);
    expect(particle.trail.length).toBe(1);
  });

  it("rejects initial conditions outside the supported domain", () => {
    const manager = new ParticleManager({ domainHalfExtent: 75 });
    expect(() => manager.create({ position: [75.01, 0, 0] })).toThrow("outside the supported domain");
    expect(manager.count()).toBe(0);
  });

  it("classifies domain exit separately and preserves the last valid state", () => {
    const manager = new ParticleManager({ domainHalfExtent: 75 });
    const particle = manager.create({
      position: [74, 2, 3],
      velocity: [2, 0, 0],
      state: ParticleState.MOVING,
    });
    const position = particle.position;
    const velocity = particle.velocity;
    manager.update(1);

    expect(particle.state).toBe(ParticleState.OUT_OF_DOMAIN);
    expect(particle.position).toBe(position);
    expect(particle.position.toArray()).toEqual([74, 2, 3]);
    expect(particle.velocity).toBe(velocity);
    expect(particle.velocity.toArray()).toEqual([2, 0, 0]);
    expect(particle.coordinateTime).toBe(0);
    expect(particle.trail.length).toBe(0);
    expect(particle.outOfDomain.attemptedPosition.toArray()).toEqual([76, 2, 3]);
    expect(particle.outOfDomain.previousState).toBe(ParticleState.MOVING);
    expect(particle.state).not.toBe(ParticleState.CAPTURED);
  });

  it("restores an out-of-domain particle through the existing reset path", () => {
    const manager = new ParticleManager({ domainHalfExtent: 75 });
    const particle = manager.create({ position: [74, 0, 0], velocity: [2, 0, 0] });
    manager.update(1);
    expect(particle.state).toBe(ParticleState.OUT_OF_DOMAIN);
    manager.reset(particle.id);
    expect(particle.state).toBe(ParticleState.IDLE);
    expect(particle.position.toArray()).toEqual([74, 0, 0]);
    expect(particle.outOfDomain.attemptedPosition.toArray()).toEqual([0, 0, 0]);
  });

  it("clears all particles and selection", () => {
    const manager = new ParticleManager();
    const particles = manager.spawnBatch([{ id: 1 }, { id: 2 }]);
    manager.select(2);

    manager.clear();

    expect(manager.count()).toBe(0);
    expect(manager.selected()).toBeNull();
    expect(particles.every((particle) => !particle.alive && particle.trail.length === 0)).toBe(true);
  });

  it("supports selecting and clearing one particle without UI", () => {
    const manager = new ParticleManager();
    const particle = manager.create({ id: "selected" });

    expect(manager.select("selected")).toBe(particle);
    expect(manager.selected()).toBe(particle);
    expect(manager.select("missing")).toBeNull();
    expect(manager.selected()).toBe(particle);
    manager.clearSelection();
    expect(manager.selected()).toBeNull();
  });

  it("reuses all particle, vector, array, and trail buffers during update", () => {
    const manager = new ParticleManager({ maxParticles: 1000, maxTrailLength: 16 });
    const particles = manager.spawnBatch(Array.from({ length: 1000 }, (_, index) => ({
      position: [index, 0, 0],
      velocity: [1, 0, 0],
    })));
    const particlePool = manager.particles;
    const activeSlots = manager.activeSlots;
    const position = particles[0].position;
    const velocity = particles[0].velocity;
    const trailBuffer = particles[0].trail.positions;

    for (let step = 0; step < 240; step += 1) manager.update(1 / 240);

    expect(manager.particles).toBe(particlePool);
    expect(manager.activeSlots).toBe(activeSlots);
    expect(particles[0].position).toBe(position);
    expect(particles[0].velocity).toBe(velocity);
    expect(particles[0].trail.positions).toBe(trailBuffer);
    expect(manager.count()).toBe(1000);
  });
});

describe("ParticleTrail", () => {
  it("uses a fixed ring buffer and preserves chronological order", () => {
    const trail = new ParticleTrail(3);
    const input = new THREE.Vector3();
    const output = new THREE.Vector3();
    for (let value = 1; value <= 4; value += 1) trail.push(input.set(value, value + 1, value + 2));

    expect(trail.length).toBe(3);
    expect(trail.positions).toHaveLength(9);
    expect(trail.read(0, output).toArray()).toEqual([2, 3, 4]);
    expect(trail.read(2, output).toArray()).toEqual([4, 5, 6]);
  });

  it("supports enable, disable, and clear", () => {
    const trail = new ParticleTrail(2);
    const position = new THREE.Vector3(1, 2, 3);
    trail.disable();
    expect(trail.push(position)).toBe(false);
    expect(trail.length).toBe(0);
    trail.enable();
    expect(trail.push(position)).toBe(true);
    trail.clear();
    expect(trail.length).toBe(0);
  });

  it("resizes only on request and preserves the newest samples", () => {
    const trail = new ParticleTrail(4);
    const input = new THREE.Vector3();
    const output = new THREE.Vector3();
    for (let value = 1; value <= 4; value += 1) trail.push(input.set(value, 0, 0));
    const previous = trail.positions;
    expect(trail.resize(2)).toBe(true);
    expect(trail.positions).not.toBe(previous);
    expect(trail.read(0, output).x).toBe(3);
    expect(trail.read(1, output).x).toBe(4);
    const resized = trail.positions;
    expect(trail.resize(2)).toBe(false);
    expect(trail.positions).toBe(resized);
  });
});

describe("ParticleRenderer", () => {
  it("renders all particles with one Points object and reusable attributes", () => {
    const manager = new ParticleManager({ maxParticles: 4 });
    manager.spawnBatch([
      { position: [1, 2, 3], color: 0xff0000 },
      { position: [4, 5, 6], color: 0x00ff00 },
    ]);
    const renderer = new ParticleRenderer({ maxParticles: 4 });
    const positions = renderer.positions;
    const colors = renderer.colors;

    expect(renderer.object).toBeInstanceOf(THREE.Points);
    expect(renderer.sync(manager)).toBe(true);
    expect(renderer.geometry.drawRange.count).toBe(2);
    expect(Array.from(renderer.positions.slice(0, 6))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(renderer.positions).toBe(positions);
    expect(renderer.colors).toBe(colors);
    expect(renderer.sync(manager)).toBe(false);
  });

  it("renders trail ring buffers with one reusable LineSegments geometry", () => {
    const manager = new ParticleManager({ maxParticles: 2, maxTrailLength: 4 });
    const particle = manager.create({ position: [0, 0, 0], velocity: [1, 0, 0] });
    const renderer = new ParticleRenderer({ maxParticles: 2, maxTrailLength: 4 });
    const trailPositions = renderer.trailPositions;

    manager.update(1);
    manager.update(1);
    manager.update(1);
    renderer.sync(manager);

    expect(renderer.trailObject).toBeInstanceOf(THREE.LineSegments);
    expect(renderer.trailGeometry.drawRange.count).toBe(4);
    expect(Array.from(renderer.trailPositions.slice(0, 12))).toEqual([
      1, 0, 0, 2, 0, 0,
      2, 0, 0, 3, 0, 0,
    ]);
    expect(renderer.trailPositions).toBe(trailPositions);

    manager.reset(particle.id);
    renderer.sync(manager);
    expect(renderer.trailGeometry.drawRange.count).toBe(0);
  });

  it("releases geometry and material resources", () => {
    const renderer = new ParticleRenderer();
    const geometryDispose = vi.spyOn(renderer.geometry, "dispose");
    const materialDispose = vi.spyOn(renderer.material, "dispose");
    const trailGeometryDispose = vi.spyOn(renderer.trailGeometry, "dispose");
    const trailMaterialDispose = vi.spyOn(renderer.trailMaterial, "dispose");

    renderer.dispose();

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(trailGeometryDispose).toHaveBeenCalledOnce();
    expect(trailMaterialDispose).toHaveBeenCalledOnce();
  });

  it("updates rendering appearance without replacing GPU buffers", () => {
    const renderer = new ParticleRenderer({ maxParticles: 2, maxTrailLength: 4 });
    const positions = renderer.positions;
    const trailPositions = renderer.trailPositions;

    renderer.setAppearance({
      particleSize: 0.6,
      particleOpacity: 0.7,
      particleBrightness: 1.2,
      trailVisible: false,
      trailOpacity: 0.5,
      trailBrightness: 1.3,
      trailFade: 0.6,
      trailColorMode: "age",
    });

    expect(renderer.material.size).toBe(0.6);
    expect(renderer.material.opacity).toBe(0.7);
    expect(renderer.haloMaterial.size).toBeCloseTo(1.41);
    expect(renderer.trailObject.visible).toBe(false);
    expect(renderer.trailMaterial.opacity).toBe(0.5);
    expect(renderer.positions).toBe(positions);
    expect(renderer.trailPositions).toBe(trailPositions);
  });

  it("uses deterministic monotonic current-speed coloring", () => {
    const manager = new ParticleManager({ maxParticles: 1, maxTrailLength: 3 });
    const particle = manager.create({ velocity: [0.5, 0, 0] });
    const renderer = new ParticleRenderer({ maxParticles: 1, maxTrailLength: 3 });
    renderer.setAppearance({ trailColorMode: "speed", trailSpeedMaximum: 2, trailFade: 0 });
    manager.update(1);
    manager.update(1);
    renderer.sync(manager);
    const slowGreen = renderer.trailColors[1];
    particle.velocity.set(2, 0, 0);
    manager.update(1);
    renderer.sync(manager);
    expect(renderer.trailColors[1]).toBeGreaterThan(slowGreen);
    expect(renderer.getSpeedLegend()).toEqual({ minimum: 0, midpoint: 1, maximum: 2 });
    expect(renderer.colors[0]).toBe(1);
    expect(renderer.colors[1]).toBe(1);
    expect(renderer.colors[2]).toBe(1);
  });

  it("limits dynamic GPU update ranges to used particle and trail data", () => {
    const manager = new ParticleManager({ maxParticles: 1000, maxTrailLength: 1024 });
    manager.create({ velocity: [1, 0, 0] });
    manager.update(1 / 240);
    manager.update(1 / 240);
    const renderer = new ParticleRenderer({ maxParticles: 1000, maxTrailLength: 1024 });
    renderer.sync(manager);
    expect(renderer.positionUpdateRange.count).toBe(3);
    expect(renderer.colorUpdateRange.count).toBe(3);
    expect(renderer.trailPositionUpdateRange.count).toBe(6);
    expect(renderer.trailColorUpdateRange.count).toBe(6);
    expect(renderer.trailPositionUpdateRange.count).toBeLessThan(renderer.trailPositions.length);
  });

  it("resizes manager and renderer trail buffers outside update loops", () => {
    const manager = new ParticleManager({ maxParticles: 2, maxTrailLength: 4 });
    const renderer = new ParticleRenderer({ maxParticles: 2, maxTrailLength: 4 });
    const oldManagerBuffer = manager.particles[0].trail.positions;
    const oldRendererBuffer = renderer.trailPositions;
    expect(manager.resizeTrailCapacity(8)).toBe(true);
    expect(renderer.resizeTrailCapacity(8)).toBe(true);
    expect(manager.particles[0].trail.positions).not.toBe(oldManagerBuffer);
    expect(renderer.trailPositions).not.toBe(oldRendererBuffer);
    expect(manager.maxTrailLength).toBe(8);
    expect(renderer.maxTrailLength).toBe(8);
  });

  it("uses one transform for particle and trail buffers without rewriting source history", () => {
    const manager = new ParticleManager({ maxParticles: 1, maxTrailLength: 4 });
    const particle = manager.create({ position: [2, 0, 0] });
    particle.trail.push({ x: 1, y: 0, z: 0 });
    particle.trail.push({ x: 2, y: 0, z: 0 });
    manager.touch();
    const transform = new RenderScaleTransform({ mode: RenderScaleMode.PHYSICAL, metresPerWorldUnit: 2e9 });
    transform.setSchwarzschildRadiusMetres(10e9);
    const renderer = new ParticleRenderer({ maxParticles: 1, maxTrailLength: 4, scaleTransform: transform });
    renderer.sync(manager);
    expect(renderer.positions[0]).toBe(10);
    expect([...renderer.trailPositions.slice(0, 6)]).toEqual([5, 0, 0, 10, 0, 0]);
    expect([...particle.trail.positions.slice(0, 6)]).toEqual([1, 0, 0, 2, 0, 0]);
    const particleRevision = manager.revision();
    transform.setMode(RenderScaleMode.NORMALIZED);
    expect(renderer.sync(manager)).toBe(true);
    expect(manager.revision()).toBe(particleRevision);
    expect(renderer.positions[0]).toBe(2);
    expect([...renderer.trailPositions.slice(0, 6)]).toEqual([1, 0, 0, 2, 0, 0]);
  });
});
