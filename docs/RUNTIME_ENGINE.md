# Runtime Engine

The v0.3 runtime separates simulation time, render time, snapshots, subsystem execution, and resource ownership without changing the v0.1 physical model or visible behavior.

## Frame sequence

```text
requestAnimationFrame(timestamp)
  → SimulationClock.tick
      → zero or more fixed 1/240 s SubsystemManager.update calls
  → SubsystemManager.render with the current immutable snapshot view
  → request the next animation frame
```

Rendering always runs once per requestAnimationFrame callback, including while simulation time is paused. Time scale affects only the number of fixed simulation steps.

## SimulationClock and SimulationState

`SimulationState` contains runtime values only: running, paused, timeScale, frame, simulationTime, and renderTime. `SimulationClock` owns the fixed-step accumulator and exposes start, stop, pause, resume, reset, and setTimeScale.

Supported scales are 0.25×, 0.5×, 1×, 2×, 5×, 10×, 50×, and 100×. Frame gaps are clamped to 100 ms. A frame performs at most 480 simulation steps; excess accumulated time is dropped to protect responsiveness after suspension, debugging pauses, or severe stalls.

## SnapshotManager

SnapshotManager preallocates a ring of at least two caller-defined buffers. `publish` copies into the next buffer, `latest` returns its frozen read-only view, and `revision` identifies publications. The current renderer consumes a snapshot containing mass-derived render data and no longer calls the physics model from the animation loop.

A snapshot view is immutable to consumers but backed by a reusable ring slot. Consumers must not retain a view beyond the documented buffer window. Persistent history belongs in a separate explicitly allocated recording system.

## ResourceManager

ResourceManager records ownership in creation order and disposes in reverse order. It recognizes functions, objects with `dispose`, objects with `disconnect`, and explicit disposer callbacks for buffers or external resources. Disposal is idempotent. Failures are collected so every remaining resource still receives cleanup before an AggregateError is reported.

The application registers renderer ownership, geometry/material owners, the control panel, Store subscriptions, and the beforeunload listener. Renderer disposal continues to own its ResizeObserver and WebGL renderer teardown.

## SubsystemManager

Subsystems register before initialization and are sorted by numeric order with stable registration order as the tie-breaker. Optional initialize, update, render, and dispose hooks receive the existing objects directly; the manager does not allocate per call. Disposal runs in reverse order and continues after individual failures.

The particle subsystem and rendering subsystem are registered and active. Future physics, HUD, input, and profiler systems can join the same lifecycle without changing the clock or frame driver.

## Performance assumptions

- The animation loop creates no objects, arrays, vectors, closures, or snapshots.
- Snapshot buffers, source objects, subsystem entries, and callbacks are allocated during startup.
- Indexed loops avoid per-frame iterator creation in subsystem execution.
- Current grid deformation allocations remain state-change work, not animation-loop work, and are tracked separately by the performance baseline.
- At 100× speed, a normal 60 Hz frame requires about 400 fixed steps. The 480-step cap supports this case while bounding stalled frames.

## Known limitations

- There is no public runtime control UI in this PR; clock controls are engine APIs only.
- Excess simulation backlog is intentionally dropped when the substep cap is reached.
- Snapshots provide transient double-buffered views, not an archival history.
- The current physical model remains state-change driven and is not advanced by fixed steps because v0.1 has no evolving physics state.
