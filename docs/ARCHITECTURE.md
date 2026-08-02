# Architecture

## Current system

`main.js` is the composition root. It creates the Store, Schwarzschild model, renderer, grid, mass representation, and control panel. State changes synchronously update the grid; requestAnimationFrame updates the mass representation and renders the scene. A beforeunload handler releases all owned resources.

```text
ControlPanel → Store → main.js → VolumetricGrid
                         │
                         └→ MassObject → Renderer
```

This is appropriately small for v0.1 but concentrates orchestration and timing in one file. Store broadcasts clone the full state, VolumetricGrid combines topology/sampling/deformation/upload, and ControlPanel combines input commands with read-only metrics.

## Target dependency direction

```text
ui / hud / rendering
        ↓
     systems
        ↓
 core contracts ← physics
        ↑
      utils
```

- Physics never imports rendering, UI, HUD, or Three.js.
- Rendering consumes physics snapshots but does not own simulation truth.
- UI emits validated commands; HUD only reads projected state.
- Systems own clocks, lifecycle, orchestration, and cleanup order.
- Core contains stable runtime contracts rather than domain implementations.
- Utilities remain small and domain-neutral.

## Runtime model

The planned frame sequence is:

1. Coalesce input commands.
2. Run zero or more fixed physics steps.
3. Publish an immutable revisioned snapshot.
4. Synchronize changed rendering resources.
5. Update presentation-only systems.
6. Render the frame.

This sequence is documentation only in v0.6-core. The existing v0.1 loop remains unchanged until tests and baselines are available.

## Performance principles

- Static topology and GPU resources are created once.
- Physics batch APIs use typed arrays and caller-provided output buffers.
- State revisions prevent unnecessary grid and HUD updates.
- Frame-critical code does not allocate temporary vectors, colors, or arrays.
- Worker or GPU compute is adopted only after CPU profiling demonstrates value.
- Bundle size, frame time, update time, memory, and draw calls are regression metrics.

## Research-quality principles

- Every numerical model states coordinates, units, domain, assumptions, and error behavior.
- Reference cases and tolerances accompany numerical changes.
- Physical observables, educational proxies, and visual deformations use distinct contracts.
- Experiment results include version, configuration, timestep, precision, and platform metadata.
- Reproducibility and correctness take precedence over visual novelty.

## Migration strategy

1. Characterize current behavior.
2. Introduce one public contract at a time.
3. Keep existing classes behind compatible adapters.
4. Measure performance before and after each hot-path change.
5. Deprecate old paths only after equivalent behavior is verified.

No existing feature is removed as part of the architecture foundation.
