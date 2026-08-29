import { describe, expect, it } from "vitest";
import {
  NullGeodesicStateIndex as I,
  PhotonStatus,
  SchwarzschildNullGeodesicSystem,
  SchwarzschildUnits,
  nullRadialVelocity,
} from "../../src/physics/index.js";

const SOLAR_MASS_KG = 1.98847e30;
function createSystem(options = {}) {
  return new SchwarzschildNullGeodesicSystem({ units: new SchwarzschildUnits(SOLAR_MASS_KG), ...options });
}

function advanceUntilTerminal(system, step = 0.25, limit = 10000) {
  for (let i = 0; i < limit && system.status === PhotonStatus.ACTIVE; i += 1) system.advanceAffine(step);
  return system.status;
}

describe("Schwarzschild null geodesic core", () => {
  it("uses affine parameter and preserves an exactly radial null trajectory", () => {
    const system = createSystem({ maximumRadius: 20 });
    system.initialize({ radius: 5, phi: 0, energy: 1, angularMomentum: 0, radialVelocity: -1 });
    system.advanceAffine(0.2);
    expect(system.state.values[I.AFFINE_PARAMETER]).toBeCloseTo(0.2, 12);
    expect(system.state.values[I.RADIUS]).toBeCloseTo(4.8, 10);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(1e-12);
    expect("properTimeSI" in system).toBe(false);
  });

  it("terminates inward radial light as CAPTURED and outward radial light as ESCAPED", () => {
    const captured = createSystem({ maximumRadius: 4 });
    captured.initialize({ radius: 1.2, energy: 1, angularMomentum: 0, radialVelocity: -1 });
    expect(advanceUntilTerminal(captured, 0.02)).toBe(PhotonStatus.CAPTURED);

    const escaped = createSystem({ maximumRadius: 3 });
    escaped.initialize({ radius: 2, energy: 1, angularMomentum: 0, radialVelocity: 1 });
    expect(advanceUntilTerminal(escaped, 0.05)).toBe(PhotonStatus.ESCAPED);
  });

  it("preserves the null condition for a non-radial photon", () => {
    const system = createSystem({ maximumRadius: 30, maximumAffineStep: 0.01 });
    const radius = 12;
    const energy = 1;
    const angularMomentum = 3;
    system.initialize({
      radius,
      energy,
      angularMomentum,
      radialVelocity: nullRadialVelocity(radius, energy, angularMomentum, -1),
    });
    for (let i = 0; i < 200; i += 1) system.advanceAffine(0.02);
    expect(system.status).toBe(PhotonStatus.ACTIVE);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(1e-9);
  });

  it("uses the Schwarzschild radius normalization r_s = 1", () => {
    const system = createSystem();
    expect(() => system.initialize({ radius: 1, energy: 1, angularMomentum: 0, radialVelocity: -1 })).toThrow();
    const r = 10;
    const b = 2.5;
    const radial = nullRadialVelocity(r, 1, b, -1);
    const f = 1 - 1 / r;
    expect(radial * radial + f * b * b / (r * r)).toBeCloseTo(1, 12);
  });
});
