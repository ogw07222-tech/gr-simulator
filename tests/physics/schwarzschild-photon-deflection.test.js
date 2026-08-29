import { describe, expect, it } from "vitest";
import {
  PhotonStatus,
  SchwarzschildNullGeodesicSystem,
  SchwarzschildUnits,
  createPhotonInitialCondition,
  weakFieldDeflectionRadians,
  writePhotonDeflectionMeasurement,
} from "../../src/physics/index.js";

const units = new SchwarzschildUnits(1.98847e30);

function scatteringMeasurement({ impactParameter = 25, startRadius = 500, maximumAffineStep = 0.05 } = {}) {
  const system = new SchwarzschildNullGeodesicSystem({
    units,
    maximumRadius: startRadius + 0.5,
    maximumAffineStep,
  });
  system.initialize(createPhotonInitialCondition({ radius: startRadius, impactParameter, radialDirection: -1 }));
  const initial = new Float64Array(system.state.values);
  for (let i = 0; i < 5000 && system.status === PhotonStatus.ACTIVE; i += 1) {
    system.advanceAffine(0.25);
  }
  const measurement = {};
  if (system.status === PhotonStatus.ESCAPED) {
    writePhotonDeflectionMeasurement(initial, system.state.values, system.state.angularMomentum, measurement);
  }
  return { system, measurement };
}

describe("Schwarzschild photon deflection diagnostics", () => {
  it("measures incoming and outgoing asymptotic coordinate directions from the integrated trajectory", () => {
    const { system, measurement } = scatteringMeasurement();
    expect(system.status).toBe(PhotonStatus.ESCAPED);
    expect(Math.hypot(measurement.incomingDirection.x, measurement.incomingDirection.z)).toBeCloseTo(1, 12);
    expect(Math.hypot(measurement.outgoingDirection.x, measurement.outgoingDirection.z)).toBeCloseTo(1, 12);
    expect(measurement.deflectionAngleRadians).toBeGreaterThan(0);
  });

  it("agrees with the first-order weak-field result alpha ~= 4GM/(bc^2)", () => {
    const impactParameter = 25;
    const { system, measurement } = scatteringMeasurement({ impactParameter });
    const weakField = weakFieldDeflectionRadians(impactParameter);
    const relativeDifference = Math.abs(measurement.deflectionAngleRadians - weakField) / weakField;
    expect(system.status).toBe(PhotonStatus.ESCAPED);
    // For b = 25 r_s, the known O((r_s/b)^2) Schwarzschild term alone is
    // (15*pi/16)(r_s/b)^2 ~= 5.9% of the first-order 2 r_s/b term.
    // An 8% band allows that physical correction plus the finite 500 r_s boundary,
    // while remaining meaningfully tighter than a generic weak-field check.
    expect(relativeDifference).toBeLessThan(0.08);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);
  });
});
