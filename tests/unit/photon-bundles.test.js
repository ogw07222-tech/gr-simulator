import { describe, expect, it } from "vitest";
import { PhotonRenderer, PhotonSubsystem } from "../../src/systems/index.js";

const COUNTS = [1, 8, 32, 64];

describe("bounded Schwarzschild photon bundles", () => {
  for (const count of COUNTS) {
    it(`integrates ${count} independent photon${count === 1 ? "" : "s"} with the validated solver`, () => {
      const photons = new PhotonSubsystem({ enabled: true, photonCount: count, maxTrailLength: 16 });
      expect(photons.count()).toBe(count);
      const solvers = new Set();
      const stateBuffers = new Set();
      for (let index = 0; index < count; index += 1) {
        const geodesic = photons.geodesicAt(index);
        solvers.add(geodesic);
        stateBuffers.add(geodesic.state.values);
        expect(photons.idAt(index)).toBe(`photon-${index}`);
      }
      expect(solvers.size).toBe(count);
      expect(stateBuffers.size).toBe(count);

      photons.resetWorkCounters();
      const completed = photons.update(1e-5);
      expect(completed).toBeGreaterThan(0);
      const diagnostics = photons.getDiagnostics();
      expect(diagnostics.integrationPasses).toBe(count);
      expect(diagnostics.diagnosticUpdates).toBe(count);
      expect(diagnostics.trajectoryUpdates).toBe(count);
      expect(diagnostics.trailUpdates).toBe(count);
      for (let index = 0; index < count; index += 1) {
        expect(photons.trailAt(index).count).toBe(2);
        expect(photons.geodesicAt(index).diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);
      }
    });
  }

  it("keeps ray state independent instead of sharing one curved path", () => {
    const photons = new PhotonSubsystem({ enabled: true, photonCount: 8 });
    const first = photons.geodesicAt(0);
    const second = photons.geodesicAt(1);
    const secondAffine = second.affineParameter();
    first.advanceAffine(0.01);
    expect(first.affineParameter()).toBeGreaterThan(secondAffine);
    expect(second.affineParameter()).toBe(secondAffine);
    expect(first.state.values).not.toBe(second.state.values);
  });

  it("keeps all recurring photon work at zero while OFF with 64 configured photons", () => {
    const renderer = new PhotonRenderer({ maxPhotons: 64, maxTrailLength: 16 });
    const photons = new PhotonSubsystem({ photonCount: 64, maxTrailLength: 16, renderer });
    const affineBefore = Array.from({ length: 64 }, (_, index) => photons.geodesicAt(index).affineParameter());
    photons.resetWorkCounters();
    for (let pass = 0; pass < 3; pass += 1) {
      photons.update(1 / 240);
      photons.render();
    }
    expect(photons.getDiagnostics()).toMatchObject({
      enabled: false,
      count: 64,
      integrationPasses: 0,
      trajectoryUpdates: 0,
      trailUpdates: 0,
      diagnosticUpdates: 0,
      renderBufferUpdates: 0,
    });
    expect(Array.from({ length: 64 }, (_, index) => photons.geodesicAt(index).affineParameter())).toEqual(affineBefore);
    expect(renderer.markerObject.visible).toBe(false);
    expect(renderer.trailObject.visible).toBe(false);
    renderer.dispose();
  });

  it("renders all 64 photons through one fixed marker/trail allocation", () => {
    const renderer = new PhotonRenderer({ maxPhotons: 64, maxTrailLength: 8 });
    const photons = new PhotonSubsystem({ enabled: true, photonCount: 64, maxTrailLength: 8, renderer });
    const markerGeometry = renderer.markerGeometry;
    const trailGeometry = renderer.trailGeometry;
    const markerBuffer = renderer.markerPositions;
    const trailBuffer = renderer.trailPositions;
    photons.update(1e-5);
    expect(photons.render()).toBe(1);
    expect(renderer.markerGeometry.drawRange.count).toBe(64);
    expect(renderer.trailGeometry.drawRange.count).toBe(128);
    expect(renderer.markerPositions.length).toBe(64 * 3);
    expect(renderer.trailPositions.length).toBe(64 * (8 - 1) * 6);
    expect(renderer.markerGeometry).toBe(markerGeometry);
    expect(renderer.trailGeometry).toBe(trailGeometry);
    expect(renderer.markerPositions).toBe(markerBuffer);
    expect(renderer.trailPositions).toBe(trailBuffer);
    renderer.dispose();
  });

  it("accepts only the bounded preset counts", () => {
    const photons = new PhotonSubsystem();
    for (const count of COUNTS) expect(photons.setCount(count)).toBe(count);
    expect(() => photons.setCount(2)).toThrow(RangeError);
    expect(() => photons.setCount(128)).toThrow(RangeError);
  });
});
