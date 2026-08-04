# Numerical Integration

`SimulationClock` retains its deterministic `1/240 s` fixed runtime step. `SchwarzschildGeodesicSystem` converts that SI proper-time increment to normalized time and independently subdivides it.

The solver uses classical fourth-order Runge–Kutta with five-component `Float64Array` state and reusable `k1–k4`, work, and candidate buffers. The default maximum normalized substep is `0.02`; the default bound is 128 substeps per runtime update. Exceeding the bound produces `NumericalFailure` instead of silently dropping accuracy or propagating NaN.

Every candidate is checked for finite values before commit. The last valid state is retained on capture, finite-domain exit, or numerical failure. The capture boundary is `ρ=1.001`, slightly outside the Schwarzschild-coordinate singularity. An inward step predicted to cross it is stopped before evaluating a singular denominator. The approved finite domain is `1.001<ρ≤10`.

The fixed RK4 implementation has no adaptive rejected steps, so `rejectedSubsteps` remains zero. The advanced UI exposes the maximum substep bound; the normalized step is documented rather than mislabeled as an adaptive tolerance.

Physics updates do not depend on render cadence. Hidden-tab handling synchronizes the clock without catch-up, preserving the existing spiral-of-death protection.
