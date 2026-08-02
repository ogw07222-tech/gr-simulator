# Roadmap

Version targets describe dependency order, not delivery dates. Every milestone must preserve the v0.1 experience unless a separately reviewed migration says otherwise.

## v0.2 — Safety baseline

- Characterization tests for current physics, state, UI, and cleanup
- Automated production build and browser smoke test
- Performance and memory baseline scenarios

Exit criterion: current behavior is repeatably verifiable.

## v0.3 — Runtime foundation

- Application lifecycle and subsystem contracts
- Fixed-step simulation clock separated from rendering
- Selector subscriptions and revision-based updates
- Explicit resource registry and ownership rules

Exit criterion: orchestration can evolve without coupling physics to the frame loop.

## v0.4 — Physics boundary

- Units, coordinates, metric-model, batch-sampling, and snapshot contracts
- Current Schwarzschild model behind a compatible adapter
- Numerical reference cases, tolerances, and stability policies

Exit criterion: physics is deterministic and independently testable without Three.js or the DOM.

## v0.5 — Presentation boundary

- Rendering pipeline stages and performance budgets
- UI commands separated from HUD projections
- Particle-system contracts and pooled storage design
- Accessibility and low-performance-device policies

Exit criterion: rendering, HUD, UI, and future particles consume stable snapshots through independent boundaries.

## v0.6 — Research-grade core readiness

- Reproducible experiment metadata and benchmark harness
- Architecture decisions and numerical-method review process
- Stable public internal contracts for adding solvers and models
- Documentation, migration, performance, and release checklists

Exit criterion: new numerical models can be integrated behind tested contracts without breaking v0.1 behavior.

## Beyond v0.6

Candidate research features include multiple bodies, geodesic integration, field sampling, heatmaps, and data export. Each requires an independent physical model specification and validation plan.
