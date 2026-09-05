import { describe, expect, it } from "vitest";
import { PhotonRenderer, PhotonSubsystem } from "../../src/systems/index.js";

describe("photon runtime motion regression", () => {
  it("advances coordinate-time-driven authoritative state and the render buffer", () => {
    const renderer = new PhotonRenderer({ maxPhotons: 64, maxTrailLength: 32 });
    const photons = new PhotonSubsystem({ enabled: true, massSolar: 4e6, renderer });
    photons.applyPreset("strong");
    photons.render();

    const before = photons.writeSnapshotAt(0, {});
    const beforeMarker = Array.from(renderer.markerPositions.slice(0, 3));
    const requestedCoordinateSeconds = 0.5;
    const completed = photons.update(requestedCoordinateSeconds);
    const after = photons.writeSnapshotAt(0, {});

    expect(completed).toBeGreaterThan(0);
    expect(after.affineParameter).toBeGreaterThan(before.affineParameter);
    expect(after.coordinateTime - before.coordinateTime).toBeCloseTo(requestedCoordinateSeconds, 4);
    expect(after.radiusMetres).not.toBe(before.radiusMetres);
    expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeGreaterThan(0);
    expect(photons.trailAt(0).count).toBeGreaterThan(1);
    expect(photons.geodesicAt(0).diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);

    expect(photons.render()).toBe(1);
    const afterMarker = Array.from(renderer.markerPositions.slice(0, 3));
    expect(afterMarker).not.toEqual(beforeMarker);
    renderer.dispose();
  });

  it("derives a global observation multiplier from the Schwarzschild light-crossing time", () => {
    const photons = new PhotonSubsystem({ massSolar: 4e6 });
    expect(photons.recommendedRuntimeTimeScale()).toBeGreaterThan(39);
    expect(photons.recommendedRuntimeTimeScale()).toBeLessThan(40);
  });
});
