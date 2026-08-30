# v0.1 Physics Model

## Scope

The current model is an educational visualization based on selected Schwarzschild quantities and a weak-field grid deformation. It is not a full numerical solution of the Einstein field equations.

## Schwarzschild radius

`r_s = 2GM/c²`

The implementation clamps negative mass to zero.

## Lapse / proper-time factor

For a stationary observer, the displayed lapse is:

`α = sqrt(1 - r_s/r)`

The value is clamped to zero for `r <= r_s`.

## Spatial radius

The current visualization uses ordinary three-dimensional spatial distance:

`r = sqrt(x² + y² + z²)`

The Schwarzschild model is standard 3+1 spacetime: three spatial dimensions plus time. No fourth spatial coordinate is part of the production model.

## Grid displacement

Grid points move toward the mass using the visualization approximation:

`displacement = scale * r_s / r_sample²`

The spatial radius `r` above is exact. To preserve the established 3D grid rendering near the source, the educational grid derives a display-only softened sample radius `sqrt(r² + ε²)` and then applies the existing horizon boundary before evaluating the displacement. Maximum displacement prevents visual topology collapse. This softening is a rendering safeguard, not an additional spatial coordinate or a physical observable.

## v0.6.1 visualization mapping

The model evaluation is unchanged. At every topology vertex, the renderer stores the raw scalar

`d_raw = displacementMagnitude(x, y, z)`

before presentation. The valid numerical domain uses finite coordinates and the model's existing non-negative mass and softening rules. Evaluation at the source is made deterministic by the existing horizon/softening radius boundary; no singular value is passed to the display mapping.

Only the displayed magnitude is normalized:

`d_display = asinh(d_raw / (d_max * s)) / asinh(1 / s)`

where `d_max` is the maximum raw displacement for the current sample and `s = 0.04` is a rendering softness constant. The function is monotonic, finite, maps zero to zero and the sampled maximum to one. Changing a rendering displacement scale therefore changes geometry appearance but not `d_raw`.

The finite supported domain covers 150 world units, from -75 to +75 on each axis, with uniform 5-unit spacing. It is derived from maximum mass 300, maximum Schwarzschild radius 6, an approved orbital initial-condition range through `10 r_s`, and a 1.25 safety margin. The model is evaluated at every one of the 29,791 topology vertices. Arbitrarily distant bound or escape orbits are not claimed to fit this domain.

Neither the raw proxy nor its color legend is curvature, proper distance, an orbit solution, or a numerical-relativity result.

## v0.6.2 rendering boundary

The ordinary 3D spatial-radius sampling, raw displacement equation, display-only softening, and `asinh` normalization define the current grid proxy. Uniform grid topology, native fixed-chunk frustum testing, proximity opacity, and the blue-cyan-red palette are presentation decisions. Distance-based topology changes and render-distance omission are not used inside the supported domain.

The black central sphere is a presentation silhouette. The green translucent shell is tied to the existing visual event-horizon radius but its rim brightness is not physical emission. Neither presentation object adds an observable or changes the Schwarzschild radius.

## v0.7 analytic spacetime solver

The legacy grid deformation proxy remains unchanged and is separate from the new particle solver. Production particle motion uses conserved specific energy and angular momentum in a fixed analytic Schwarzschild metric, restricted to massive equatorial test particles. Equations, conventions, and coordinate limitations are defined in `SCHWARZSCHILD_GEODESICS.md`; the SI boundary is defined in `UNIT_SYSTEM.md`.

## v0.8 Schwarzschild photon foundation

v0.8 adds a separate equatorial null-geodesic solver in the same fixed analytic Schwarzschild spacetime. It advances photons with an affine parameter, not proper time, and validates the event horizon at `1.0 r_s`, photon sphere at `1.5 r_s`, and critical impact parameter `b_crit = (3√3/2) r_s`. Capture, scattering, near-critical strong deflection, null-condition error, numerical deflection, bounded 1/8/32/64 bundles, the shared Photon Inspector, and the Light Bending demo are documented in `PHOTON_FOUNDATION.md`. The existing massive/timelike solver is unchanged.

Photon rendering remains trajectory visualization rather than per-pixel ray tracing or image synthesis. Kerr spacetime, accretion disks, Einstein-ring image synthesis, and WebGPU/WASM photon acceleration are outside v0.8.0 scope.
