import { describe, expect, it } from "vitest";
import {
  ParticleManager,
  SimulationClock,
  SimulationState,
} from "../../src/systems/index.js";

describe("simulation integration", () => {
  it("uses the runtime clock to pause particle and trail updates", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    const particles = new ParticleManager({ maxParticles: 1, maxTrailLength: 8 });
    const particle = particles.create({ position: [1, 0, 0], velocity: [1, 0, 0] });
    const update = (delta) => particles.update(delta);
    clock.start(0);

    clock.tick(1000 / 60, update);
    const runningPosition = particle.position.x;
    const runningTrailLength = particle.trail.length;
    expect(runningPosition).toBeGreaterThan(1);
    expect(runningTrailLength).toBeGreaterThan(0);

    clock.pause();
    clock.tick(1000 / 30, update);
    expect(particle.position.x).toBe(runningPosition);
    expect(particle.trail.length).toBe(runningTrailLength);
    expect(state.renderTime).toBeGreaterThan(0);
  });

  it("connects time scale and reset through existing engine APIs", () => {
    const state = new SimulationState();
    const clock = new SimulationClock({ state });
    const particles = new ParticleManager({ maxParticles: 1, maxTrailLength: 8 });
    const particle = particles.create({ position: [1, 0, 0], velocity: [1, 0, 0] });
    const update = (delta) => particles.update(delta);
    clock.start(0);
    clock.setTimeScale(2);

    clock.tick(100, update);
    expect(state.simulationTime).toBeGreaterThan(0.19);
    expect(particle.position.x - 1).toBeCloseTo(state.simulationTime, 10);

    particles.reset(particle.id);
    clock.reset();
    expect(particle.position.x).toBe(1);
    expect(particle.trail.length).toBe(0);
    expect(state.simulationTime).toBe(0);
  });
});
