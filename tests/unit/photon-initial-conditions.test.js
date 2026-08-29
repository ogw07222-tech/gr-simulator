import { describe, expect, it } from "vitest";
import { PHOTON_PRESETS, createPhotonInitialCondition } from "../../src/physics/index.js";

describe("photon initial conditions", () => {
  it("constructs null launch data with b = L/E and explicit radial/angular directions", () => {
    const initial = createPhotonInitialCondition({ radius: 12, phi: 0.4, impactParameter: 3, radialDirection: -1, angularDirection: -1, energy: 1 });
    expect(initial.phi).toBe(0.4); expect(initial.angularMomentum).toBe(-3); expect(initial.radialVelocity).toBeLessThan(0);
    const f = 1 - 1 / initial.radius;
    expect(initial.radialVelocity ** 2 + f * initial.angularMomentum ** 2 / initial.radius ** 2).toBeCloseTo(initial.energy ** 2, 12);
  });
  it("supports inward and outward launches", () => {
    const inward = createPhotonInitialCondition({ radius: 10, impactParameter: 2, radialDirection: -1 });
    const outward = createPhotonInitialCondition({ radius: 10, impactParameter: 2, radialDirection: 1 });
    expect(inward.radialVelocity).toBeLessThan(0); expect(outward.radialVelocity).toBeGreaterThan(0);
  });
  it("provides the four compact scientific presets", () => {
    expect(Object.keys(PHOTON_PRESETS)).toEqual(["weak", "strong", "nearCritical", "capture"]);
    for (const preset of Object.values(PHOTON_PRESETS)) expect(() => createPhotonInitialCondition(preset)).not.toThrow();
  });
});
