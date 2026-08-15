# GR-4D Simulator

> Browser-based General Relativity Simulation Engine

Current release: **v0.7.4**. Configurable clock speed and presentation-only adaptive units build on the v0.7.3 rendering boundary without altering the v0.7 physics model or its SI interfaces.

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

# Integrated Milestones

## v0.4 — Particle Engine

Completed: fixed-capacity particle storage, batched rendering, fixed-memory trail buffers, and selection API.

## v0.5 — Simulation Integration

Completed: default particle startup, runtime controls, GPU trail rendering, and runtime status projection.

## v0.6 — Scientific UI

Completed: responsive viewport-first dashboard, separate simulation and rendering-preference panels, live runtime telemetry, accessible mobile drawers, and rendering-only presentation settings. This milestone introduces no new physics behavior.

Localization: English is the default interface language, Korean is available from the top-bar selector, and a valid selected locale is restored from `gr4d.locale`. Invalid saved values fall back to English. Locale changes update only interface text and accessibility metadata; runtime, physics, particles, camera, and rendering state remain untouched.

## Scientific Integrity and Change Management

Every scientific or scientific-looking change is governed by these permanent rules:

1. State the governing equation before implementation.
2. Document assumptions, coordinate conventions, units, and valid domains.
3. Preserve raw model outputs; display transforms must be separate and explicit.
4. Label proxies and educational approximations as non-observables where applicable.
5. Add reference cases, boundary cases, and asymptotic tests before merge.
6. Never tune physics equations merely to improve appearance or pass a visual test.
7. Keep simulation state independent from rendering and UI preferences.
8. Bound memory and per-frame work; update loops must reuse allocated storage.
9. Record performance and numerical impact before and after material changes.
10. Version all visible scientific meaning changes and document migrations.
11. Require dedicated review for new metrics, solvers, integrators, and orbit classifications.
12. Do not claim scientific capability that is not implemented and validated.

The v0.6.1 correction follows these rules: the Schwarzschild proxy is unchanged, raw displacements remain inspectable, and the nonlinear `asinh` mapping exists only in rendering.

The v0.6.2 correction uses one scientifically bounded, uniformly sampled domain. Maximum mass 300 gives `r_s = 6`; the future orbit contract supports initial radii through `10 r_s`, with a 1.25 safety margin producing `[-75, 75]³`. Distance LOD, render-distance omission, and camera-proximity opacity changes are not used. FPS caps and color maps remain presentation-only; raw displacement, the fixed timestep, and physical equations are unchanged. Domain exit is distinct from event-horizon capture.

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

## Release validation policy

The project uses semantic-version-aware visual validation to avoid repeating the complete bilingual screenshot matrix for every maintenance change. In the `0.x.y` series, `x` is the minor component and `y` is the patch component.

| Release type | English visual audit | Korean visual audit | Locale parity tests |
| --- | --- | --- | --- |
| Patch `0.x.y` → `0.x.(y+1)` | Full | Targeted only | Required |
| Minor `0.x.y` → `0.(x+1).0` | Full | Full | Required |
| Major `0.x.y` → `1.0.0` | Full | Full | Required |

Patch releases still run Korean key-parity, automated localization, compile, and build checks. Full Korean visual coverage is required for a patch when it changes Korean strings, localization architecture, typography, text wrapping, localized guide/help content, locale persistence/switching, or responsive structures likely to differ by language. Narrow localization changes require targeted Korean verification of the affected surfaces; broad changes require the full bilingual matrix.

## Production Deployment

The production application is designed for `https://ogw07222-tech.github.io/gr-simulator/`. GitHub Actions owns production publishing: validation and build complete before the immutable `dist` artifact can reach the `github-pages` environment. Local development retains root-based Vite routing, while Pages builds use `/gr-simulator/` through an explicit deployment environment flag.

Exactly one workflow, `.github/workflows/deploy-pages.yml`, owns Pages publishing. It uploads only `dist`; repository root, source files, dependencies, and the source `index.html` are never Pages artifacts.

Repository owners must configure **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. A merged deployment configuration is not evidence of a live release; only a successful Pages workflow and environment URL establish deployment success.

CI job-name changes are operational migrations. The current single `verify` check remains unchanged in v0.6.2; issue #20 tracks a coordinated split with repository ruleset updates.

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

## v0.7 scientific runtime contract

The production particle path now evaluates equatorial timelike geodesics in one fixed analytic Schwarzschild spacetime. SI values cross a dedicated unit boundary; integration uses `r_s=1`, `c=1`, and normalized proper time. `SimulationClock` remains authoritative for fixed updates, physics publishes reusable snapshots, and rendering never evaluates geodesic equations.

The supported solver domain is `1.001<r/r_s≤10`. The lower boundary avoids the Schwarzschild-coordinate singularity and records capture at the last valid state; the upper boundary records `OutOfDomain` without automatically claiming escape. This milestone does not solve the Einstein field equations or add Kerr rotation, photons, self-gravity, radiation reaction, lensing, or inclined orbital planes.
