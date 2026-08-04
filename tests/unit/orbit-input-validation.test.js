import { describe, expect, it } from "vitest";
import { validateOrbitConfiguration } from "../../src/ui/OrbitInputValidation.js";

const valid = {
  preset: "circular", massSolar: 4e6, radius: 6, radialBeta: 0,
  tangentialBeta: 0, maximumSubsteps: 128,
};

describe("orbit input validation", () => {
  it("accepts the production circular defaults", () => {
    expect(validateOrbitConfiguration(valid)).toBeNull();
  });

  it("rejects unsupported mass, radius, and substep ranges", () => {
    expect(validateOrbitConfiguration({ ...valid, massSolar: 0 })).toBe("orbit.errorMass");
    expect(validateOrbitConfiguration({ ...valid, radius: 1 })).toBe("orbit.errorRadius");
    expect(validateOrbitConfiguration({ ...valid, maximumSubsteps: 0 })).toBe("orbit.errorSubsteps");
  });

  it("rejects superluminal local-observer input", () => {
    expect(validateOrbitConfiguration({
      ...valid, preset: "local", radialBeta: 0.8, tangentialBeta: 0.7,
    })).toBe("orbit.errorVelocity");
  });
});
