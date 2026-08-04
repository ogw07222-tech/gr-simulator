import { describe, expect, it } from "vitest";
import {
  ParticleManager,
  ParticleRenderer,
  SchwarzschildParticleSubsystem,
  SimulationClock,
  SimulationState,
  SnapshotManager,
} from "../../src/systems/index.js";

function createPositionBuffer() {
  const data = { x: 0, y: 0, z: 0, properTime: 0 };
  const view = Object.freeze({
    get x() { return data.x; },
    get y() { return data.y; },
    get z() { return data.z; },
    get properTime() { return data.properTime; },
  });
  return { data, view };
}

function copyPosition(target, source) {
  target.x = source.renderX;
  target.y = source.renderY;
  target.z = source.renderZ;
  target.properTime = source.properTime;
}

describe("v0.7 geodesic motion pipeline", () => {
  it("publishes positive fixed-step motion to snapshot and renderer coordinate projections", () => {
    const runtimeState = new SimulationState();
    const clock = new SimulationClock({ state: runtimeState });
    const particles = new ParticleManager({ maxParticles: 1, maxTrailLength: 64, domainHalfExtent: 75 });
    const physics = new SchwarzschildParticleSubsystem({ particles });
    const renderer = new ParticleRenderer({ maxParticles: 1, maxTrailLength: 64 });
    const snapshots = new SnapshotManager({ createBuffer: createPositionBuffer, copy: copyPosition });
    const snapshotSource = {};
    physics.writeSnapshot(snapshotSource);
    snapshots.publish(snapshotSource);

    const initialZ = physics.particle.position.z;
    let receivedDelta = 0;
    let updateCount = 0;
    const update = (delta) => {
      receivedDelta = delta;
      updateCount += 1;
      physics.update(delta);
      physics.writeSnapshot(snapshotSource);
      snapshots.publish(snapshotSource);
    };

    clock.start(0);
    clock.tick(100, update);
    renderer.sync(particles);

    expect(receivedDelta).toBe(1 / 240);
    expect(receivedDelta).toBeGreaterThan(0);
    expect(updateCount).toBe(24);
    expect(physics.particle.position.z).toBeGreaterThan(initialZ);
    expect(snapshots.latest().z).toBe(physics.particle.position.z);
    expect(snapshots.latest().properTime).toBeGreaterThan(0);
    expect(renderer.positions[2]).toBeCloseTo(snapshots.latest().z, 7);

    const pausedPhysicsZ = physics.particle.position.z;
    const pausedSnapshotRevision = snapshots.revision();
    const pausedRendererRevision = renderer.lastRevision;
    clock.pause();
    clock.tick(200, update);
    renderer.sync(particles);

    expect(physics.particle.position.z).toBe(pausedPhysicsZ);
    expect(snapshots.revision()).toBe(pausedSnapshotRevision);
    expect(renderer.lastRevision).toBe(pausedRendererRevision);

    renderer.dispose();
    particles.dispose();
  });
});
