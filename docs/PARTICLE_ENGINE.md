# Particle Engine

The v0.4 Particle Engine provides fixed-capacity particle storage, lifecycle, trails, selection, and efficient rendering. It does not implement Schwarzschild geodesics, orbit classification, HUD controls, or particle-specific relativistic physics.

## Architecture

```text
ParticleManager
  ├─ preallocated Particle pool
  ├─ dense active-slot Int32Array
  ├─ free-slot Int32Array
  ├─ id → slot lookup
  └─ selected particle id

Particle
  ├─ reusable Vector3 and Color values
  ├─ scalar physical metadata
  ├─ fixed ParticleTrail ring buffer
  └─ reusable userData object

ParticleRenderer
  └─ one THREE.Points object + reusable position/color buffers
```

The ParticleManager and ParticleRenderer are registered as an active runtime subsystem. With zero particles, update returns immediately and the renderer exposes a zero-count draw range, preserving the existing scene.

## Data model

Every pool slot owns id, position, velocity, acceleration, restMass, properTime, coordinateTime, energy, angularMomentum, radius, color, alive, state, trail, and userData. Position, velocity, acceleration, and angular momentum are Three.js Vector3 instances. Color is a Three.js Color.

Supported states are Idle, Moving, Orbiting, Escaping, Captured, and Absorbed. The engine stores caller-assigned state but intentionally does not classify trajectories.

## Lifecycle API

- `create(options)`: activates one preallocated slot.
- `destroy(id)`: deactivates and recycles one slot.
- `reset(id?)`: restores one or all active particles to their spawn data.
- `clear()`: releases every active slot and selection.
- `update(delta)`: performs allocation-free base kinematics and trail capture.
- `count()`, `findById(id)`, `particleAt(index)`: allocation-free access.
- `spawnBatch(definitions)`: creates a batch and rolls back on failure.
- `select(id)`, `selected()`, `clearSelection()`: selection API without UI.

The base update applies acceleration to velocity, then velocity to position, and increments coordinateTime. It does not modify properTime, energy, angularMomentum, or state. Future physics systems own those quantities and may update the same preallocated particle values before rendering.

## Trail storage

Each ParticleTrail owns a fixed Float32Array of `maxTrailLength × 3`. `push` overwrites the oldest sample after reaching capacity. `read(index, target)` writes into a caller-provided vector and does not allocate. Enable, disable, and clear preserve the buffer.

## Rendering

ParticleRenderer uses one BufferGeometry and one PointsMaterial for the entire pool. Position and color attributes are fixed-capacity DynamicDrawUsage buffers. Manager revisions avoid GPU uploads when no particle data changed. Per-particle Mesh objects are never created.

## Performance assumptions

- Default capacity: 1,000 particles.
- Desktop trail capacity: 1,024 positions per particle by default; selectable capacities are 256, 512, and 1,024.
- Mobile trail capacity: 512 positions per particle by default; selectable capacities are 256 and 512.
- At the 240 Hz fixed step, these capacities retain about 4.27 seconds and 2.13 seconds respectively. They are storage durations, not orbital-period guarantees.
- Total fixed trail storage, including manager positions and renderer position/color segment buffers, is approximately 58.55 MiB on desktop and 29.25 MiB on mobile at 1,000-particle capacity.
- Particle render position/color storage: approximately 24 KB.
- No objects, vectors, arrays, or buffers are created inside ParticleManager.update, Particle.update, ParticleTrail.push, or ParticleRenderer.sync.
- Active slots are dense, so update and buffer sync scale with active count rather than maximum capacity.
- Trail capacity changes replace typed buffers once and preserve the newest available samples. No resizing occurs in the animation loop.
- Trail color is a monotonic blue-green mapping of current velocity magnitude in simulation world units per second. It does not represent energy, redshift, proper velocity, or a fraction of light speed.
- A 60 FPS target with 1,000 active particles assumes four 240 Hz fixed updates per normal frame; final budgets require browser profiling on target hardware.

## Known limitations and extension points

- Point radius is stored in the data model but the first renderer uses a uniform point size. A future shader or instanced backend can consume the existing radius field.
- Trails are stored but not rendered in this PR.
- Proper-time evolution, energy, angular momentum, captured/absorbed transitions, and geodesics belong to future physics systems.
- Photon, spacecraft, clock, massive-particle, and test-particle behavior can specialize update policy without replacing pool or render storage.
- Snapshot export and persistent trajectory recording require explicit copy/recording systems; reusable live buffers are not history storage.
