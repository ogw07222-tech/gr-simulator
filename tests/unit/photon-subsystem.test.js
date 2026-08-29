import { describe, expect, it } from "vitest";
import { PhotonSubsystem } from "../../src/systems/index.js";

describe("PhotonSubsystem single-photon launch", () => {
  it("remains frozen while OFF and advances affine parameter only after ON", () => {
    const photons = new PhotonSubsystem({ massSolar: 4e6 });
    const before = photons.geodesic.affineParameter(); photons.update(1); expect(photons.geodesic.affineParameter()).toBe(before);
    photons.setEnabled(true); photons.update(1); expect(photons.geodesic.affineParameter()).toBeGreaterThan(before);
  });
  it("applies each launch preset through the same null solver", () => {
    const photons = new PhotonSubsystem();
    for (const preset of ["weak", "strong", "nearCritical", "capture"]) { photons.applyPreset(preset); expect(photons.configuration.preset).toBe(preset); expect(photons.geodesic.diagnostics.lastRelativeNullError).toBeLessThan(1e-12); }
  });
});
