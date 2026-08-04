# Rendering performance architecture

## Supported simulation domain

The renderer and particle runtime share one finite domain derived from the approved future orbit-engine contract:

`domainHalfExtent = maximumOrbitRadiusAtMaximumMass × safetyMargin`

The UI supports mass through `M = 300`. With the existing model constants `G = 1` and `c = 10`, the maximum Schwarzschild radius is `r_s = 6` simulation units. The formally supported initial-condition range is limited to `10 r_s`, or radius `60`, at maximum mass. A `1.25` safety margin produces a half extent of `75` and a full grid width of `150`.

This contract does not claim support for every mathematically possible bound or escape orbit. Future orbit initial conditions must remain inside `[-75, 75]` on every axis. Particles that attempt to leave are classified `OutOfDomain`, independently of `Captured`, and retain their last valid position, velocity, time, and trail for diagnostics and reset.

## Uniform grid topology

The entire supported domain uses uniform five-unit spacing. Thirty-one points per axis produce 29,791 unique model vertices and 86,490 line segments. Construction partitions the unchanged index topology into 64 fixed spatial chunks that share the same position and color attributes. Camera distance never changes draw ranges, spacing, or connectivity.

Native frustum culling skips a fixed chunk only when its complete bounds are outside the view. When it re-enters, every original segment returns with identical topology. Distance-based LOD, sparse far-field geometry, render-distance omission, and distance-driven chunk switching are intentionally rejected because they degraded visual continuity.

Raw deformation is evaluated only when mass, W distance, mode, warp scale, or maximum display displacement changes. Identical inputs do not recompute or upload attributes. Camera movement changes only the smooth proximity opacity and cannot dirty model or GPU buffers.

## Close-camera fade and camera range

Camera distance from the origin drives a cubic smoothstep. The fade is transparent within 35% of the configured distance and reaches normal opacity at its outer distance. This visibility aid changes one material opacity without changing topology or raw values.

OrbitControls permits free orbit, pan, and zoom while limiting maximum camera distance to `120` units, 1.6 times the supported half extent. This leaves useful context around the finite world without encouraging inspection of an unmodelled infinite far field.

## Frame scheduling

FrameRateController supports 30, 45, 60, 90, 120 FPS and unlimited rendering. It carries sub-frame remainder forward and never blocks or spins. SimulationClock integrates at exactly 1/240 second regardless of render selection. Hidden tabs synchronize both clocks and discard backlog.

## Presentation mappings

- Speed uses actual velocity magnitude and increasing brightness from blue-gray through pale cyan to white.
- Grid color retains the documented `asinh` normalization and blue-cyan-red educational-proxy palette.
- The translucent green horizon rim and black body are presentation objects, not new observables.

## Diagnostics

`window.__GR4D_DIAGNOSTICS__.getSnapshot()` reports animation/render frames, fixed timestep, FPS cap, grid recomputations/uploads, uniform-grid capacity, draw calls, primitives, geometries, and textures. Snapshots allocate only when explicitly requested; animation-loop counters do not.
