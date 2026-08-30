import { describe, expect, it } from "vitest";
import { PhotonStatus } from "../../src/physics/index.js";
import { PhotonSubsystem } from "../../src/systems/index.js";

describe("PhotonSubsystem deflection snapshot", () => {
  it("does not synthesize a deflection angle before scattering completes", () => {
    const photons = new PhotonSubsystem();
    const snapshot = photons.writeSnapshot({});
    expect(snapshot.status).toBe(PhotonStatus.ACTIVE);
    expect(Number.isNaN(snapshot.deflectionAngleRadians)).toBe(true);
    expect(Number.isFinite(snapshot.incomingAsymptoticDirectionX)).toBe(true);
    expect(Number.isNaN(snapshot.outgoingAsymptoticDirectionX)).toBe(true);
  });
});
