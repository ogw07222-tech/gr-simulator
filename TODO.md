# TODO

This backlog describes future work; this architecture PR does not implement new simulator features.

## P0 — Regression safety

- [x] Add unit tests for Schwarzschild radius, effective radius, lapse, curvature proxy, and displacement.
- [x] Add Store state-copy, subscription, unsubscription, and update tests.
- [x] Add a browser smoke test for mode selection, sliders, HUD metrics, and camera startup.
- [x] Add CI for lint, unit tests, production build, and browser smoke tests.
- [ ] Capture baseline bundle size, frame time, grid-update time, heap allocation, and draw calls.

## P1 — Runtime architecture

- [ ] Introduce a `SimulatorApp` lifecycle without changing visible behavior.
- [ ] Separate fixed-step simulation time from render time.
- [ ] Add selector-based subscriptions and dirty revisions.
- [ ] Define idempotent `start`, `stop`, and `dispose` contracts.
- [ ] Define resource ownership for shared geometry, material, texture, and observers.

## P1 — Physics architecture

- [ ] Define units, coordinate, model-input, sample-output, and snapshot contracts.
- [ ] Adapt the current Schwarzschild model behind a metric-model interface.
- [ ] Separate physical observables, educational proxies, and rendering deformation.
- [ ] Define invalid-input, singularity, softening, and clamp policies.
- [ ] Establish reference cases and numerical tolerances before adding solvers.

## P1 — Rendering, UI, and HUD

- [ ] Split static grid topology, CPU deformation, and GPU upload stages.
- [ ] Remove temporary Vector3, Color, and Array allocations from measured hot paths.
- [ ] Separate ControlPanel commands from read-only metric views.
- [ ] Add HUD selectors and locale/unit formatters.
- [ ] Add keyboard, focus, and reduced-motion acceptance criteria.

## P2 — Research platform

- [ ] Add benchmark fixtures and reproducible experiment metadata.
- [ ] Add Architecture Decision Record and experiment-report templates.
- [ ] Define worker/GPU-compute evaluation criteria.
- [ ] Design particle storage, pooling, LOD, and update budgets.
- [ ] Define data export and reproducibility requirements.

## Deferred features

Multiple masses, geodesic integration, heatmaps, particle effects, and additional metrics remain deferred until P0 and P1 foundations are validated.
