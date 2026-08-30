import { describe, expect, it } from "vitest";
import { RenderScaleMode, RenderScaleTransform } from "../../src/rendering/index.js";
import { PhotonRenderer, PhotonSubsystem, PhotonTrail } from "../../src/systems/index.js";

describe("photon rendering", () => {
  it("keeps a bounded trail in one fixed storage allocation", () => {
    const trail = new PhotonTrail(4);
    const storage = trail.positions;
    for (let sample = 0; sample < 6; sample += 1) trail.append(sample, 0, -sample);
    expect(trail.positions).toBe(storage);
    expect(trail.count).toBe(4);
    expect(trail.oldestIndex()).toBe(2);
    const oldest = trail.oldestIndex() * 3;
    expect(trail.positions[oldest]).toBe(2);
  });

  it("uses a compact CSS-pixel marker and reuses geometry/buffers while following the render transform", () => {
    const transform = new RenderScaleTransform();
    const renderer = new PhotonRenderer({ maxTrailLength: 8, pointSize: 8, scaleTransform: transform });
    const photons = new PhotonSubsystem({ enabled: true, maxTrailLength: 8, renderer });
    const markerGeometry = renderer.markerGeometry;
    const markerBuffer = renderer.markerPositions;
    const trailGeometry = renderer.trailGeometry;
    const trailBuffer = renderer.trailPositions;

    expect(renderer.markerMaterial.size).toBe(8);
    expect(renderer.markerMaterial.sizeAttenuation).toBe(false);
    expect("haloObject" in renderer).toBe(false);
    expect(photons.render()).toBe(1);
    expect(renderer.markerPositions[0]).toBeCloseTo(photons.position.x, 6);
    expect(renderer.markerPositions[2]).toBeCloseTo(photons.position.z, 6);

    photons.update(1e-5);
    photons.render();
    expect(photons.trail.count).toBeGreaterThan(1);
    expect(renderer.trailGeometry.drawRange.count).toBeGreaterThan(0);
    expect(renderer.markerGeometry).toBe(markerGeometry);
    expect(renderer.markerPositions).toBe(markerBuffer);
    expect(renderer.trailGeometry).toBe(trailGeometry);
    expect(renderer.trailPositions).toBe(trailBuffer);

    transform.setSchwarzschildRadiusMetres(2e9);
    transform.setMetresPerWorldUnit(1e9);
    transform.setMode(RenderScaleMode.PHYSICAL);
    expect(photons.render()).toBe(1);
    expect(renderer.markerPositions[0]).toBeCloseTo(photons.position.x * 2, 5);
    renderer.dispose();
  });

  it("does no recurring render-buffer work while OFF", () => {
    const renderer = new PhotonRenderer();
    const photons = new PhotonSubsystem({ renderer });
    photons.resetWorkCounters();
    photons.update(1);
    photons.render();
    const diagnostics = photons.getDiagnostics();
    expect(diagnostics.integrationPasses).toBe(0);
    expect(diagnostics.trajectoryUpdates).toBe(0);
    expect(diagnostics.trailUpdates).toBe(0);
    expect(diagnostics.diagnosticUpdates).toBe(0);
    expect(diagnostics.renderBufferUpdates).toBe(0);
    expect(renderer.markerObject.visible).toBe(false);
    expect(renderer.trailObject.visible).toBe(false);
    renderer.dispose();
  });
});
