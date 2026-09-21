# Subsystem Integration Audit

## Scope

This audit examines the application entry point after the Runtime Engine and Particle Engine merges. It distinguishes a disconnected implementation from an intentionally headless or empty subsystem. No runtime behavior is changed by this document.

## Entry-point flow

```text
main.js
  ├─ ResourceManager owns runtime resources and cleanup
  ├─ SimulationState stores runtime-only state
  ├─ SimulationClock drives fixed updates from requestAnimationFrame
  ├─ SnapshotManager publishes reusable immutable render views
  ├─ SubsystemManager orders particle update/render before scene rendering
  ├─ ParticleManager owns the fixed particle pool
  ├─ ParticleRenderer owns the shared particle BufferGeometry
  └─ existing Store / Physics / Grid / UI / Renderer remain active
```

## Implemented subsystem inventory

| Implementation | Connection to `main.js` | Runtime use | Status |
| --- | --- | --- | --- |
| `SimulationState` | Constructed directly | Passed to clock and subsystem update/render | Connected |
| `SimulationClock` | Constructed directly | `tick()` runs in every RAF callback | Connected |
| `SnapshotManager` | Constructed directly | Published on Store changes and read during rendering | Connected |
| `ResourceManager` | Constructed directly | Owns renderer, grid, mass object, particle engine, controls, subscriptions, and listener cleanup | Connected |
| `SubsystemManager` | Constructed directly | Initializes, updates, renders, and disposes registered subsystems | Connected |
| Particle subsystem | Registered at order 50 | Updates ParticleManager and synchronizes ParticleRenderer | Connected |
| Rendering subsystem | Registered at order 100 | Updates the mass representation from a snapshot and renders the scene | Connected |
| `ParticleManager` | Constructed and resource-managed | Receives every fixed update | Connected |
| `ParticleRenderer` | Constructed, resource-managed, and added to the Three.js scene | Synchronizes on particle revision | Connected |

## Internal particle components

`Particle`, `ParticleTrail`, and `ParticleState` are not standalone subsystems. They are implementation components instantiated and managed by ParticleManager:

- ParticleManager preallocates every Particle.
- Each Particle constructs and owns one ParticleTrail.
- Particle validates and stores ParticleState values.

They should not be independently registered in `main.js`; doing so would duplicate ownership and lifecycle responsibilities.

`TIME_SCALES` is an exported runtime constant, not a subsystem. SimulationClock uses SimulationState validation for supported values. No time-control UI exists by design.

## Why the engines are not visually apparent

### Runtime Engine

The Runtime Engine is infrastructure. It intentionally preserves the existing visible behavior:

- requestAnimationFrame still renders the camera and scene.
- fixed updates currently have no evolving GR physics state to advance.
- pause, resume, reset, and time-scale are engine APIs without controls.
- resource and snapshot management are lifecycle behavior, not visual output.

### Particle Engine

The Particle Engine is connected but starts empty:

- ParticleManager defaults to zero active particles.
- ParticleRenderer is present in the scene with draw range zero.
- no default particle is spawned because that would add a new visible simulation feature.
- trails are stored only after particles exist and are not rendered in the current engine scope.
- selection is API-only and has no UI.

## Disconnected subsystems

None. Every implemented runtime subsystem is connected either directly in `main.js` or through its owning manager.

The `hud` and `utils` directories contain architecture-boundary documentation only. They do not contain implemented subsystems and therefore cannot be connected.

## Required behavioral changes

None. Spawning particles, adding runtime controls, rendering trails, or adding HUD output would be new behavior rather than integration of a disconnected subsystem. Those changes require separately scoped feature work and should not be introduced as an entry-point wiring fix.
