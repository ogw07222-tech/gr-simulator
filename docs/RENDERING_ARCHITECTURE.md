# Rendering performance architecture

## Fixed spatial grid chunks

The evaluated 240-unit grid remains unchanged. Its line topology is partitioned once at construction into near, middle, and far bands across eight octants, yielding at most 24 reusable LineSegments objects. Geometry, attributes, materials, bounding volumes, and LOD ordering are never rebuilt while the camera moves.

Each chunk stores low, middle, and high cumulative draw ranges. Low contains one quarter of its line segments, middle one half, and high all retained segments. Camera-to-chunk-center thresholds select the range at 50 and 110 simulation world units with a five-unit hysteresis band. The default maximum render distance is 140 units. Native Three.js frustum testing and the explicit distance test suppress non-visible chunks.

Raw deformation is evaluated for every topology vertex whenever mass, W distance, mode, warp scale, or maximum display displacement changes. Identical inputs return without recomputation or GPU upload. Camera movement cannot dirty these buffers.

## Close-camera fade

Distance from the camera to each chunk bounds drives a cubic smoothstep. At 35% of the configured distance the chunk is transparent; at the configured outer distance normal opacity is restored. Materials are fixed per chunk, so opacity changes do not allocate or rebuild geometry. The mass body, event horizon, particle, and trail are independent objects and do not fade with the grid.

## Frame scheduling

FrameRateController supports 30, 45, 60, 90, 120 FPS and unlimited rendering. It carries sub-frame remainder forward and never blocks or spins. SimulationClock still ticks from requestAnimationFrame and integrates at exactly 1/240 second regardless of render selection. Hidden tabs synchronize both clocks and discard backlog, preventing a restoration burst.

## Presentation mappings

- Speed: actual velocity magnitude → normalized display speed → increasing brightness from blue-gray through pale cyan to white.
- Grid: preserved `asinh` display normalization → blue, cyan, red educational-proxy palette.
- Horizon: existing visual horizon radius → translucent green Fresnel-style shader. Rim light is not emission.
- Body: fixed presentation sphere → unlit black silhouette. It is distinct from the horizon definition.

## Diagnostics

`window.__GR4D_DIAGNOSTICS__.getSnapshot()` returns a newly copied snapshot only when explicitly requested. Counters themselves update allocation-free and include animation/render frames, fixed timestep, FPS cap, grid recomputations/uploads/visibility, draw calls, lines, points, triangles, geometries, and textures.
