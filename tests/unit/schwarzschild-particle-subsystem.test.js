import { describe, expect, it } from "vitest";
import { ParticleManager, SchwarzschildParticleSubsystem } from "../../src/systems/index.js";

describe("SchwarzschildParticleSubsystem", () => {
  it("creates and advances the default particle through the geodesic engine", () => {
    const particles = new ParticleManager({ maxParticles: 4, maxTrailLength: 16, domainHalfExtent: 75 });
    const subsystem = new SchwarzschildParticleSubsystem({ particles });
    const particle = particles.findById("default-particle");
    const initialX = particle.position.x;
    subsystem.update(1);
    expect(particles.count()).toBe(1);
    expect(particle.position.x).not.toBe(initialX);
    expect(particle.trail.length).toBe(1);
    expect(particle.coordinateTime).toBeGreaterThan(particle.properTime);
  });

  it("applies valid input atomically and preserves the previous orbit on error", () => {
    const particles = new ParticleManager({ domainHalfExtent: 75 });
    const subsystem = new SchwarzschildParticleSubsystem({ particles });
    subsystem.apply({ radius: 5 });
    expect(subsystem.configuration.radius).toBe(5);
    expect(() => subsystem.apply({ radius: 1 })).toThrow(RangeError);
    expect(subsystem.configuration.radius).toBe(5);
    expect(subsystem.geodesic.state.values[1]).toBe(5);
  });

  it("resets the orbit and clears its fixed-capacity trail", () => {
    const particles = new ParticleManager({ maxTrailLength: 16, domainHalfExtent: 75 });
    const subsystem = new SchwarzschildParticleSubsystem({ particles });
    subsystem.update(1);
    expect(subsystem.particle.trail.length).toBeGreaterThan(0);
    subsystem.reset();
    expect(subsystem.particle.trail.length).toBe(0);
    expect(subsystem.geodesic.state.values[1]).toBe(6);
  });

  it("uses bounded long-trail storage and samples by displacement", () => {
    const particles = new ParticleManager({ maxParticles: 1000, maxTrailLength: 16384, domainHalfExtent: 75 });
    const subsystem = new SchwarzschildParticleSubsystem({ particles });
    expect(subsystem.particle.trail.positions.length).toBe(16384 * 3);
    subsystem.update(0.001);
    const firstLength = subsystem.particle.trail.length;
    subsystem.update(0.001);
    expect(subsystem.particle.trail.length).toBe(firstLength);
    expect(particles.count()).toBe(1);
  });

  it("measures positive relativistic periapsis advance for the demo orbit", () => {
    const particles = new ParticleManager({ maxTrailLength: 4096, domainHalfExtent: 75 });
    const subsystem = new SchwarzschildParticleSubsystem({ particles });
    subsystem.apply({ preset: "precession" });
    const delta = subsystem.maximumSafeAdvanceSeconds() * 0.5;
    for (let step = 0; step < 20000 && subsystem.geodesic.diagnostics.radialPeriods < 2; step += 1) {
      subsystem.update(delta);
    }
    const { radialPeriods, lastRadialPeriodAngle, periapsisAdvance } = subsystem.geodesic.diagnostics;
    expect(radialPeriods).toBeGreaterThanOrEqual(2);
    expect(lastRadialPeriodAngle).toBeGreaterThan(2 * Math.PI);
    expect(periapsisAdvance).toBeGreaterThan(0);
    expect(Number.isFinite(periapsisAdvance * 180 / Math.PI)).toBe(true);
  });
});
