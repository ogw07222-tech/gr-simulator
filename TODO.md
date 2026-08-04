# TODO

## v0.6.2 rendering performance correction

- [x] Record the single-grid and full-trail-upload baseline.
- [x] Replace rejected distance LOD and render-distance omission with the approved uniform finite domain.
- [x] Add native fixed-chunk frustum culling and a domain-guided camera limit.
- [x] Validate particle initial positions and preserve last valid state on explicit domain exit.
- [x] Add persistent rendering FPS caps without changing the 240 Hz fixed step.
- [x] Map speed to white and the educational grid proxy from blue to red.
- [x] Separate the black presentation body from the green event-horizon shell.
- [x] Add renderer counters and a repeatable 10-minute soak harness.
- [ ] Keep the orbit engine and new physical equations outside this release.

## v0.6.1 visualization corrections

- [x] Separate raw grid-model output from the nonlinear display transfer.
- [x] Add grid-deformation and speed legends with units and localized labels.
- [x] Expand the world-space grid with bounded adaptive far-field spacing.
- [x] Make trail capacity configurable without per-frame reallocation.
- [x] Split English and Korean dictionaries and make English the default fallback.
- [x] Add mapping, far-field, localization-parity, and source-policy tests.
- [ ] Keep orbit classification and geodesics outside this correction release.

This backlog describes future work; this architecture PR does not implement new simulator features.

## P0 — Regression safety

- [x] Add unit tests for Schwarzschild radius, effective radius, lapse, curvature proxy, and displacement.
- [x] Add Store state-copy, subscription, unsubscription, and update tests.
- [x] Add a browser smoke test for mode selection, sliders, HUD metrics, and camera startup.
- [x] Add CI for lint, unit tests, production build, and browser smoke tests.
- [ ] Capture baseline bundle size, frame time, grid-update time, heap allocation, and draw calls.

## P1 — Runtime architecture

- [ ] Introduce a `SimulatorApp` facade without changing the integrated runtime lifecycle.
- [x] Separate fixed-step simulation time from render time.
- [ ] Add selector-based subscriptions and dirty revisions.
- [x] Define idempotent runtime start, stop, and dispose contracts.
- [x] Define and integrate resource ownership for rendering, controls, observers, listeners, and subscriptions.

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
- [x] Implement fixed particle storage, pooling, trails, selection, and one-buffer rendering.
- [ ] Profile particle LOD and update budgets on reference hardware.
- [ ] Define data export and reproducibility requirements.

## Deferred features

Multiple masses, geodesic integration, heatmaps, particle effects, and additional metrics remain deferred until P0 and P1 foundations are validated.
