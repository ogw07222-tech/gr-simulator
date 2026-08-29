import { describe, expect, it } from "vitest";
import {
  NullGeodesicStateIndex as I,
  PhotonStatus,
  SCHWARZSCHILD_CRITICAL_IMPACT_PARAMETER_RS as B_CRIT,
  SCHWARZSCHILD_HORIZON_RADIUS_RS as R_H,
  SCHWARZSCHILD_PHOTON_SPHERE_RADIUS_RS as R_PH,
  SchwarzschildNullGeodesicSystem,
  SchwarzschildUnits,
  createPhotonInitialCondition,
} from "../../src/physics/index.js";

const SOLAR_MASS_KG = 1.98847e30;
const units = new SchwarzschildUnits(SOLAR_MASS_KG);

function runImpactParameter(impactParameter, { startRadius = 40, maximumRadius = 40.2, maximumAffineStep = 0.01 } = {}) {
  const system = new SchwarzschildNullGeodesicSystem({ units, maximumRadius, maximumAffineStep });
  system.initialize(createPhotonInitialCondition({ radius: startRadius, impactParameter, radialDirection: -1 }));
  let minimumRadius = startRadius;
  for (let i = 0; i < 1000 && system.status === PhotonStatus.ACTIVE; i += 1) {
    system.advanceAffine(0.1);
    minimumRadius = Math.min(minimumRadius, system.state.values[I.RADIUS]);
  }
  return { system, minimumRadius };
}

describe("Schwarzschild photon reference physics", () => {
  it("uses r_h = r_s, r_ph = 1.5 r_s, and b_crit = 3 sqrt(3) r_s / 2", () => {
    expect(R_H).toBe(1);
    expect(R_PH).toBe(1.5);
    expect(B_CRIT).toBeCloseTo(2.598076211353316, 14);
  });

  it("captures an incoming photon below b_crit", () => {
    const { system } = runImpactParameter(B_CRIT * 0.99);
    expect(system.status).toBe(PhotonStatus.CAPTURED);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(2e-7);
  });

  it("scatters and escapes an incoming photon above b_crit", () => {
    const { system, minimumRadius } = runImpactParameter(B_CRIT * 1.1);
    expect(system.status).toBe(PhotonStatus.ESCAPED);
    expect(minimumRadius).toBeGreaterThan(R_PH);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);
  });

  it("shows strong deflection just above b_crit", () => {
    const { system, minimumRadius } = runImpactParameter(B_CRIT * 1.001, { maximumAffineStep: 0.005 });
    expect(system.status).toBe(PhotonStatus.ESCAPED);
    expect(minimumRadius).toBeGreaterThan(R_PH);
    expect(minimumRadius).toBeLessThan(1.6);
    expect(Math.abs(system.state.values[I.PHI])).toBeGreaterThan(2 * Math.PI);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(2e-8);
  });

  it("keeps the photon sphere as an unstable null circular orbit when initialized exactly", () => {
    const system = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 10, maximumAffineStep: 0.002 });
    system.initialize({ radius: R_PH, phi: 0, energy: 1, angularMomentum: B_CRIT, radialVelocity: 0 });
    system.advanceAffine(1);
    expect(system.status).toBe(PhotonStatus.ACTIVE);
    expect(system.state.values[I.RADIUS]).toBeCloseTo(R_PH, 10);
    expect(system.state.values[I.RADIAL_VELOCITY]).toBeCloseTo(0, 10);
    expect(system.diagnostics.maximumRelativeNullError).toBeLessThan(1e-11);
  });
});
