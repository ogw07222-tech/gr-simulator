# GR-4D Simulator

> Browser-based General Relativity Simulation Engine

---

# Vision

GR-4D Simulator is not intended to be a simple gravity visualization.

The long-term goal is to build a browser-based simulation engine capable of reproducing and visualizing phenomena from General Relativity with a clean, extensible software architecture.

Ultimately, the project aims to evolve into a research-grade educational and scientific simulation platform.

---

# Project Philosophy

This project follows one principle above everything else.

> Build a simulation engine, not just a visualization.

Every implementation should prioritize:

- Correct architecture
- Scientific correctness
- Performance
- Maintainability
- Extensibility

Feature count is never more important than software quality.

---

# Development Rules

## Never

- Break existing functionality
- Remove working features
- Introduce unnecessary complexity
- Allocate objects every frame
- Ignore failing tests
- Sacrifice architecture for speed

## Always

- Performance first
- Test before merge
- CI must pass
- Modular architecture
- Reuse memory
- Minimize garbage collection
- Separate simulation from rendering

---

# Engine Architecture

The engine follows a strict separation of responsibilities.

```
SimulationClock
        │
        ▼
Physics Engine
        │
        ▼
Snapshot Manager
        │
        ▼
Renderer
        │
        ├────────► HUD
        │
        └────────► UI
```

### Rules

Renderer never modifies physics.

Physics never depends on rendering.

Communication occurs only through immutable snapshots.

Every subsystem must be independently replaceable.

---

# Current Development Status

## v0.1 — Core Architecture ✅

Completed

- Project structure
- Documentation
- Module boundaries
- README
- ROADMAP
- TODO
- CHANGELOG
- CONTRIBUTING

---

## v0.2 — Safety Baseline ✅

Completed

- Vitest
- Playwright
- ESLint
- GitHub Actions
- Physics tests
- Store tests
- Performance baseline

---

## v0.3 — Runtime Engine ✅

Completed

Subsystems

- SimulationClock
- SimulationState
- SnapshotManager
- ResourceManager
- SubsystemManager

Capabilities

- Fixed timestep (240 Hz)
- Pause / Resume
- Time scaling
- Snapshot rendering
- Resource ownership
- Stable update loop

Performance goals achieved

- No allocations in animation loop
- Buffer reuse
- Stable rendering pipeline

---

# Development Roadmap

## v0.4

Particle Engine

- ParticleManager
- Massive particles
- Test particles
- Trail system
- Selection API
- Buffer rendering

---

## v0.5

Simulation HUD

- FPS
- Simulation time
- Proper time
- Coordinate time
- Mass
- Event horizon radius
- Angular momentum
- Velocity
- Energy

---

## v0.6

Orbit Engine

- Orbit classification
- Stable orbit
- Escape orbit
- Capture
- Trail analysis

---

## v0.7

Schwarzschild Geodesics

- Timelike geodesics
- Photon sphere
- ISCO
- Perihelion precession
- Conserved quantities

---

## v0.8

Kerr Metric

- Rotating black holes
- Frame dragging
- Ergosphere
- Kerr ISCO
- Spin parameter

---

## v0.9

Photon Ray Tracing

- Photon geodesics
- Gravitational lensing
- Black hole shadow
- Photon ring
- Accretion disk

---

## v1.0

Research Edition

- Scientific inspector
- Data export
- Simulation recording
- Metric viewer
- Tensor viewer
- Experiment presets

---

# Long-Term Goals

Future development targets include

- WebGPU acceleration
- Compute shaders
- Massive particle simulation
- Numerical Relativity
- Dynamic spacetime
- Einstein Field Equation experiments

---

# Scientific Direction

Current engine

```
Mass

↓

Known Metric

↓

Geodesic Motion

↓

Visualization
```

Long-term vision

```
Stress-Energy Tensor

↓

Einstein Field Equations

↓

Metric Solver

↓

Geodesic Solver

↓

Particle Simulation

↓

Photon Simulation

↓

Scientific Visualization
```

The project intentionally grows toward increasingly realistic General Relativity rather than remaining a visual demonstration.

---

# Performance Goals

Target frame rate

- 60 FPS

Simulation

- Fixed timestep
- Stable integration
- Deterministic updates

Memory

- Zero allocations in update loops
- Buffer reuse
- Typed arrays where appropriate

Rendering

- GPU-friendly data layout
- Minimize draw calls
- Efficient BufferGeometry usage

---

# Repository Workflow

Every feature follows the same lifecycle.

Issue

↓

Branch

↓

Implementation

↓

Tests

↓

Pull Request

↓

Review

↓

Merge

No feature is considered complete until all automated verification passes.

---

# Branch Naming

```
feature/gr-vX.X-name
```

Examples

```
feature/gr-v0.4-particles

feature/gr-v0.5-hud

feature/gr-v0.6-orbits
```

---

# Pull Request Requirements

Every Pull Request must include

- Architecture summary
- Test results
- Build verification
- Performance impact
- Future extension points

---

# Lead Developer Notes

This project is designed as a long-term engineering effort.

Every architectural decision should make future implementation of

- Schwarzschild spacetime
- Kerr spacetime
- Photon ray tracing
- Scientific visualization
- Numerical Relativity

easier rather than harder.

Build the engine first.

Everything else is built on top of it.
