import { describe, expect, it, vi } from "vitest";
import { PhotonSubsystem, SubsystemManager } from "../../src/systems/index.js";

describe("Photon performance gate", () => {
  it("does zero recurring photon work while OFF", () => {
    const photons = new PhotonSubsystem();
    const beforeAffine = photons.geodesic.affineParameter();
    photons.update(1 / 240, {}, {});
    photons.render(1 / 60, {}, {});
    const diagnostics = photons.getDiagnostics();
    expect(diagnostics.enabled).toBe(false);
    expect(diagnostics.integrationPasses).toBe(0);
    expect(diagnostics.trajectoryUpdates).toBe(0);
    expect(diagnostics.trailUpdates).toBe(0);
    expect(diagnostics.diagnosticUpdates).toBe(0);
    expect(diagnostics.renderBufferUpdates).toBe(0);
    expect(diagnostics.affineParameter).toBe(beforeAffine);
  });

  it("does not stop massive-particle subsystem updates while photons are OFF", () => {
    const massiveUpdate = vi.fn();
    const manager = new SubsystemManager([{ order: 60, update: massiveUpdate }, new PhotonSubsystem()]);
    manager.initialize({});
    manager.update(1 / 240, {}, {});
    expect(massiveUpdate).toHaveBeenCalledTimes(1);
  });

  it("does real photon integration and bounded trail work only after the gate is enabled", () => {
    const photons = new PhotonSubsystem();
    photons.setEnabled(true);
    const beforeAffine = photons.geodesic.affineParameter();
    photons.update(1e-5, {}, {});
    photons.render(1 / 60, {}, {});
    const diagnostics = photons.getDiagnostics();
    expect(diagnostics.affineParameter).toBeGreaterThan(beforeAffine);
    expect(diagnostics.integrationPasses).toBe(1);
    expect(diagnostics.trajectoryUpdates).toBe(1);
    expect(diagnostics.diagnosticUpdates).toBe(1);
    expect(diagnostics.trailUpdates).toBe(1);
    expect(diagnostics.renderBufferUpdates).toBe(0);
  });
});
