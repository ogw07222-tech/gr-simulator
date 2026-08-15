# Schwarzschild Geodesics

The engine evaluates massive, non-interacting test-particle geodesics in one fixed, analytic Schwarzschild spacetime. It does not solve the Einstein field equations.

## Geometry

With signature `(-,+,+,+)` and standard Schwarzschild coordinates,

`ds² = -(1-r_s/r)c²dt² + (1-r_s/r)⁻¹dr² + r²(dθ² + sin²θ dφ²)`.

The v0.7 solver is restricted to the equatorial plane `θ=π/2`. `r=r_s` is a coordinate singularity in this chart; `r=0` is the curvature singularity. Schwarzschild coordinate time diverges toward the horizon and is not a local observer's clock.

## Integrated equations

For normalized proper time `s=cτ/r_s`, radius `ρ=r/r_s`, radial component `u=dρ/ds`, conserved specific energy `ε`, and normalized specific angular momentum `λ`:

- `dt̄/ds = ε/(1-1/ρ)`
- `dρ/ds = u`
- `dφ/ds = λ/ρ²`
- `du/ds = -1/(2ρ²) + λ²/ρ³ - 3λ²/(2ρ⁴)`
- `dτ̄/ds = 1`

The effective potential and radial first integral are

`V_eff = (1-1/ρ)(1+λ²/ρ²)` and `u² = ε²-V_eff`.

No circular motion is forced. Circular presets only construct analytic initial constants; the same equations then evolve the state.

At the snapshot boundary, normalized polar coordinates remain canonical. `RenderScaleTransform` maps those coordinates to either `1 world unit per r_s` or the selected SI-derived physical presentation scale. This transform affects presentation only and never feeds back into the solver.

## Initial conditions

Circular timelike initial data for `ρ>1.5` use

`λ = ρ/sqrt(2ρ-3)` and `ε = sqrt(2)(ρ-1)/sqrt(ρ(2ρ-3))`.

For a local static orthonormal observer outside the horizon, local velocity components `β_r` and `β_φ` require `β_r²+β_φ²<1`. With `γ=(1-β²)⁻¹/²` and `f=1-1/ρ`:

- `ε=γ sqrt(f)`
- `λ=γρβ_φ`
- `u=γβ_r sqrt(f)`

Advanced input accepts `ε`, `λ`, and radial direction, rejecting radii for which `ε²<V_eff`.

Reference radii in the selected `r_s` convention are: photon sphere `1.5 r_s`, marginally bound circular orbit `2 r_s`, and ISCO `3 r_s`. Stable circular timelike orbits require `r≥3 r_s`; circular timelike orbits between `1.5 r_s` and `3 r_s` are unstable.
