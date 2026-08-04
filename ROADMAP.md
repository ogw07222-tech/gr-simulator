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

### v0.6.1 correction gate

- [x] Separate raw model values from documented display transforms.
- [x] Add explicit legends and units for grid deformation and trail speed.
- [x] Use a bounded uniform grid and fixed configurable trail storage.
- [x] Make English the default locale while retaining complete Korean support.
- [ ] Keep orbit classification and Schwarzschild geodesics deferred to separately reviewed physics milestones.

### Delivery infrastructure

- [x] Define a validated GitHub Pages build using the `/gr-simulator/` repository base path.
- [x] Gate production artifact upload and deployment behind lint, unit tests, and build validation.
- [ ] Confirm the first live deployment only after the GitHub Pages workflow succeeds on `main`.

### v0.6.2 render-performance correction

- [x] Define the finite domain from maximum mass, `10 r_s` orbital support, and a 1.25 safety margin.
- [x] Use one uniform five-unit grid without distance LOD, sparse far-field topology, or render-distance omission.
- [x] Retain native fixed-chunk frustum culling and a guided camera range.
- [x] Classify domain exit independently from capture while preserving last valid particle state.
- [x] Keep render FPS caps independent from the fixed simulation timestep.
- [x] Bound dynamic particle/trail GPU uploads to used ranges.
- [x] Add repeatable resource-growth soak diagnostics.
- [ ] Orbit classification and Schwarzschild geodesics remain deferred.

## Beyond v0.6

Candidate research features include multiple bodies, geodesic integration, field sampling, heatmaps, and data export. Each requires an independent physical model specification and validation plan.
