# Orbit Classification

Classification is based on constants, radial state, and terminal status—not the rendered curve.

- `StableCircular`: `|u|<10⁻⁹`, radial acceleration below `10⁻⁹`, and `ρ≥3`.
- `UnstableCircular`: the same equilibrium tests with `1.5<ρ<3`.
- `BoundNonCircular`: active, non-circular, and `ε<1`.
- `UnboundScattering`: active with `ε≥1` and outward radial motion.
- `PlungingCaptured`: the capture boundary was reached.
- `OutOfDomain`: the finite `10 r_s` contract was crossed. This is not automatically claimed as physical escape.
- `NumericalFailure`: finite checks or the substep safety bound failed.
- `Indeterminate`: the available instantaneous evidence is insufficient.

The categories are conservative. Future turning-point history may refine provisional active classifications without changing the integrated trajectory.
