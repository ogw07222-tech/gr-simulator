import { describe, expect, it } from "vitest";
import { SCHWARZSCHILD_CRITICAL_IMPACT_PARAMETER_RS } from "../../src/physics/relativity/index.js";
import {
  LIGHT_BENDING_IMPACT_PARAMETERS_RS,
  LIGHT_BENDING_START_X_RS,
  PhotonRenderer,
  PhotonSubsystem,
} from "../../src/systems/index.js";

describe("Light Bending photon demo", () => {
  it("launches eight approximately parallel independent null geodesics with physical impact parameters", () => {
    const photons = new PhotonSubsystem({ enabled: true });
    photons.applyLightBendingDemo();
    expect(photons.count()).toBe(8);
    expect(photons.getDiagnostics().preset).toBe("lightBending");
    expect(LIGHT_BENDING_IMPACT_PARAMETERS_RS.some((b) => b < SCHWARZSCHILD_CRITICAL_IMPACT_PARAMETER_RS)).toBe(true);
    expect(LIGHT_BENDING_IMPACT_PARAMETERS_RS.some((b) => b > SCHWARZSCHILD_CRITICAL_IMPACT_PARAMETER_RS)).toBe(true);

    const solverSet = new Set();
    for (let index = 0; index < photons.count(); index += 1) {
      const snapshot = photons.writeSnapshotAt(index, {});
      solverSet.add(photons.geodesicAt(index));
      expect(snapshot.impactParameterRs).toBeCloseTo(LIGHT_BENDING_IMPACT_PARAMETERS_RS[index], 12);
      expect(snapshot.incomingAsymptoticDirectionX).toBeGreaterThan(0.99999);
      expect(Math.abs(snapshot.incomingAsymptoticDirectionZ)).toBeLessThan(1e-4);
      expect(snapshot.x).toBeCloseTo(-LIGHT_BENDING_START_X_RS, 10);
      expect(snapshot.z).toBeCloseTo(-LIGHT_BENDING_IMPACT_PARAMETERS_RS[index], 10);
    }
    expect(solverSet.size).toBe(8);
  });

  it("produces captured and scattered rays through actual subsystem integration", () => {
    const renderer = new PhotonRenderer({ maxPhotons: 64, maxTrailLength: 128 });
    const photons = new PhotonSubsystem({
      enabled: true,
      massSolar: 1,
      maximumRadius: 50,
      renderer,
    });
    photons.applyLightBendingDemo();
    photons.resetWorkCounters();

    for (let pass = 0; pass < 16; pass += 1) {
      photons.update(1e-4);
      const diagnostics = photons.getDiagnostics();
      if (diagnostics.captured >= 2 && diagnostics.escaped >= 3) break;
    }
    photons.render();
    const diagnostics = photons.getDiagnostics();
    expect(diagnostics.captured).toBeGreaterThanOrEqual(2);
    expect(diagnostics.escaped).toBeGreaterThanOrEqual(3);
    expect(diagnostics.numericalFailures).toBe(0);
    expect(diagnostics.integrationPasses).toBeGreaterThan(0);
    expect(diagnostics.trailUpdates).toBeGreaterThan(0);
    expect(diagnostics.renderBufferUpdates).toBe(1);
    expect(renderer.markerGeometry.drawRange.count).toBe(8);
    expect(renderer.trailGeometry.drawRange.count).toBeGreaterThan(0);

    let measuredScattering = 0;
    for (let index = 0; index < photons.count(); index += 1) {
      const geodesic = photons.geodesicAt(index);
      expect(geodesic.diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);
      const snapshot = photons.writeSnapshotAt(index, {});
      if (snapshot.status === "ESCAPED") {
        expect(snapshot.deflectionAngleRadians).toBeGreaterThan(0);
        measuredScattering += 1;
      }
    }
    expect(measuredScattering).toBeGreaterThanOrEqual(3);
    renderer.dispose();
  });
});
