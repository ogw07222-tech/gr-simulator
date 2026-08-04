# Schwarzschild Validation

Validation is deterministic and runs with `npm run test:physics`.

## Analytic references

- One-solar-mass Schwarzschild radius: `2953.339382066878 m`.
- One-solar-mass time scale: `9.851279787922078×10⁻⁶ s`.
- Photon sphere: `1.5 r_s`; marginally bound orbit: `2 r_s`; ISCO: `3 r_s`.
- ISCO constants: `ε=sqrt(8/9)`, `λ=sqrt(3)`.
- `ρ=6` circular constants: `ε≈0.96225044865`, `λ=2`.

## Numerical scenarios

The automated suite covers a stable `ρ=6` circular orbit for ten proper-time periods, a multi-cycle eccentric orbit (`ε=0.965`, `λ=2`), radial plunge, unbound outward motion, refinement convergence, exact repeated-run determinism, and identical results when the same 240 fixed updates are grouped as 30 render frames or executed ungrouped.

Current acceptance limits are `10⁻¹¹` relative energy drift and normalization residual for the ten-period circular reference, `10⁻⁸` for the long eccentric reference, and `10⁻¹⁰` energy drift for plunge/domain references. Angular momentum is a fixed conserved input and therefore has zero numerical drift in this formulation.

Visible orbit closure is not used as validation. Browser smoke tests separately cover the canvas, camera, controls, pause behavior, trails, localization, and console errors.

## Performance sample

Node 24.14.0 on the development Windows host, 240 fixed updates, circular states:

| Active solvers | Elapsed | Mean physics cost/update |
|---:|---:|---:|
| 1 | 3.72 ms | 0.0155 ms |
| 100 | 33.26 ms | 0.1386 ms |
| 1000 | 138.15 ms | 0.5756 ms |

These are solver-only microbenchmarks, not browser FPS guarantees. One production scientific particle is enabled. 100 particles are currently a measured CPU reference; 1000 remains a capacity experiment, not a supported high-accuracy interactive claim. Re-run with `npm run benchmark:physics` on target hardware.

## Runtime motion observability

The production default is a circular orbit at `6 r_s` around a `4×10⁶ M☉` black hole. Its proper-time orbital period is approximately `4456.6 s` and its Schwarzschild-coordinate period is approximately `5146.1 s`. At `1×`, the expected azimuth change is only about `0.001410 rad/s`; at the default camera scale a short observation can therefore look stationary even while the solver, canonical particle, snapshot, and GPU position buffer are all advancing.

The formal diagnostics snapshot reports the clock accumulator, last fixed physics delta, update count, runtime state, normalized geodesic state, canonical render position, snapshot render position, and particle-renderer input position. The browser regression test compares every stage while running, verifies no change while paused, and uses the existing `100×` runtime control to establish visibly resolvable render-coordinate motion without changing equations, SI conversion, initial conditions, or fixed `dt`.
