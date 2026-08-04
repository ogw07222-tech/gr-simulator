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

## W-axis model

GR + W mode defines an educational effective distance:

`R_eff = sqrt(x² + y² + z² + w² + ε²)`

This is not a complete five-dimensional relativistic metric. It compares how an additional coordinate changes the apparent effect on an observed 3D slice.

## Grid displacement

Grid points move toward the mass using the visualization approximation:

`displacement = scale * r_s / R_eff²`

Softening and maximum displacement prevent divergence and visual topology collapse. This displacement is a rendering proxy, not a physical observable.

## v0.6.1 visualization mapping

The model evaluation is unchanged. At every topology vertex, the renderer stores the raw scalar

`d_raw = displacementMagnitude(x, y, z)`

before presentation. The valid numerical domain uses finite coordinates and the model's existing non-negative mass and softening rules. Evaluation at the source is made deterministic by the existing effective-radius boundary; no singular value is passed to the display mapping.

Only the displayed magnitude is normalized:

`d_display = asinh(d_raw / (d_max * s)) / asinh(1 / s)`

where `d_max` is the maximum raw displacement for the current sample and `s = 0.04` is a rendering softness constant. The function is monotonic, finite, maps zero to zero and the sampled maximum to one. Changing a rendering displacement scale therefore changes geometry appearance but not `d_raw`.

The adaptive grid covers 240 world units with nominal 3-unit near-field spacing. Far-field spacing expands geometrically by 1.5 until the boundary. The current model remains evaluated at every retained vertex; the far field is not fabricated or clamped to zero. Tests verify finite source behavior, decreasing far-field magnitude, and approach toward the model's flat asymptote.

Neither the raw proxy nor its color legend is curvature, proper distance, an orbit solution, or a numerical-relativity result.

## v0.6.2 rendering boundary

The evaluated coordinates, effective-radius domain, raw displacement equation, softening, and `asinh` normalization are unchanged. Chunk membership, camera-frustum tests, render distance, LOD draw ranges, proximity opacity, and the blue-cyan-red palette are presentation decisions applied after evaluation. A culled vertex still has the same mathematically evaluated raw value in the reusable model buffer.

The black central sphere is a presentation silhouette. The green translucent shell is tied to the existing visual event-horizon radius but its rim brightness is not physical emission. Neither presentation object adds an observable or changes the Schwarzschild radius.
