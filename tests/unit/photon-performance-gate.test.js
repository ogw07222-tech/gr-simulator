import { describe, expect, it, vi } from "vitest";
import { PhotonSubsystem, SubsystemManager } from "../../src/systems/index.js";

describe("Photon performance gate", () => {
  it("does zero recurring photon work while OFF", () => {
    const operations = {
      integrate: vi.fn(), trajectory: vi.fn(), trail: vi.fn(), diagnostics: vi.fn(), renderBuffers: vi.fn(),
    };
    const photons = new PhotonSubsystem({ operations });
    photons.update(1 / 240, {}, {});
    photons.render(1 / 60, {}, {});
    expect(photons.getDiagnostics()).toEqual({
      enabled: false,
      integrationPasses: 0,
      trajectoryUpdates: 0,
      trailUpdates: 0,
      diagnosticUpdates: 0,
      renderBufferUpdates: 0,
    });
    for (const callback of Object.values(operations)) expect(callback).not.toHaveBeenCalled();
  });

  it("does not stop massive-particle subsystem updates while photons are OFF", () => {
    const massiveUpdate = vi.fn();
    const manager = new SubsystemManager([{ order: 60, update: massiveUpdate }, new PhotonSubsystem()]);
    manager.initialize({});
    manager.update(1 / 240, {}, {});
    expect(massiveUpdate).toHaveBeenCalledTimes(1);
  });

  it("only invokes photon work hooks after the gate is enabled", () => {
    const integrate = vi.fn();
    const renderBuffers = vi.fn();
    const photons = new PhotonSubsystem({ operations: { integrate, renderBuffers } });
    photons.setEnabled(true);
    photons.update(0.1, {}, {});
    photons.render(0.1, {}, {});
    expect(integrate).toHaveBeenCalledTimes(1);
    expect(renderBuffers).toHaveBeenCalledTimes(1);
    expect(photons.getDiagnostics().integrationPasses).toBe(1);
    expect(photons.getDiagnostics().renderBufferUpdates).toBe(1);
  });
});
