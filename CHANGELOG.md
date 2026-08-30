# Changelog

## Unreleased

### v0.8.0

- Added a true Schwarzschild null-geodesic solver using affine parameter rather than proper time, with `ACTIVE` / `CAPTURED` / `ESCAPED` states, conserved null quantities, and explicit null-condition diagnostics.
- Fixed the reference geometry at event horizon `r = 1.0 r_s`, photon sphere `r = 1.5 r_s`, and critical impact parameter `b_crit = (3√3/2) r_s`; deterministic tests cover capture, scattering, near-critical strong deflection, and the unstable null circular orbit.
- Added numerical incoming/outgoing-direction deflection measurement and a weak-field regression at `b = 25 r_s` against `α ≈ 4GM/(bc²)` without injecting the analytic angle into rendering.
- Added a default-OFF photon subsystem, compact 1/8/32/64 count control, fixed-size photon markers, bounded trails, shared Particle/Photon Inspector infrastructure, and zero recurring photon integration/trajectory/trail/diagnostic/render-buffer work while OFF.
- Added an eight-ray Light Bending demo using independent validated null-geodesic integrations at impact parameters `[2.2, 2.45, 2.62, 2.8, 3.2, 4, 5, 6] r_s`, preserving the validated demo maximum affine substep of `0.005`.
- Scope remains intentionally bounded: no per-pixel ray tracing, black-hole image/shadow synthesis, accretion disk, Einstein-ring image synthesis, Kerr spacetime, or WebGPU/WASM photon acceleration.

### v0.7.11

- Added a bilingual screen-space Particle Inspector selected by click/touch, with constant CSS-pixel sizing, camera/particle-following projection, drag-safe OrbitControls coexistence, explicit behind-camera handling, and a persistent off-screen edge indicator that reuses the existing Focus Particle camera behavior.
- Reused authoritative Schwarzschild snapshots for radius, local speed, proper/coordinate time, classification, conserved quantities, local radial/tangential velocity components, and available turning radii; selection and inspection do not mutate geodesic state, timestep, conserved quantities, camera scale semantics, or grid buffers.

### v0.7.10

- Converted Periapsis Precession Demo into a draft-controlled Schwarzschild demonstration with one editable eccentricity parameter, `0.05 ≤ e ≤ 0.50`, while generated radius, conserved quantities, radial direction, and local velocity remain visible read-only results until Apply.
- Fixed the demo orbit scale at standard Darwin `p = 9 GM/c²`; explicit `r_s = 2GM/c²` conversion gives `r_peri = p/[2(1+e)]` and `r_apo = p/[2(1-e)]`, with conserved `ε` and `λ=L/(c r_s)` derived from the same convention and validated outside the `p=6+2e` separatrix and inside the `10 r_s` solver domain.
- Reused the existing radial-turning-point diagnostic to display measured periapsis advance per completed radial period; no trail rotation, angular-momentum forcing, periapsis reset, or presentation-only precession was added.

### v0.7.9

- Made the particle marker a bounded 4–24 CSS-pixel presentation control using native non-attenuated Three.js points, keeping apparent size stable across camera distance, FOV, device pixel ratio, and render-scale modes without changing particle physics or trail geometry.
- Made valid mass application update particle/grid/central-body presentation synchronously and reuse the bounded camera-safety path, preventing a rapidly enlarged physical-scale horizon from enclosing the camera and blacking out the viewport.

### v0.7.8

- Added a presentation-only 1x/2x/3x/5x/10x grid deformation gain. It multiplies line displacement only; raw deformation diagnostics, the scientific color mapping, physics, and particle motion remain unchanged.
- Stabilized normalized/physical/auto-fit view transitions with scale-aware fog, proportional clipping planes, and bounded camera visibility checks, preventing valid rendered scenes from appearing black at extreme display scales.

### v0.7.7

- Connected applied black-hole mass and render-scale revisions to the reusable grid-buffer update path. The grid remains mathematically invariant in normalized `r/r_s` view and rescales consistently in physical views without exaggerating its educational deformation proxy.
- Added localized one-shot particle focus and opt-in snapshot-driven particle follow controls. Follow preserves the camera offset and stops automatically when the particle is no longer valid.

### v0.7.6

- Removed the duplicate visualization-only mass slider; the existing validated solar-mass field and Apply Initial Condition action are now the sole black-hole mass input path.
- Defined W as a symmetric Schwarzschild-normalized visualization-slice coordinate and expanded it to a bounded `-25 rₛ` through `+25 rₛ` range with a zero default.
- Isolated W updates to the reusable grid buffers and added diagnostics proving that W weakens the deformation proxy without changing particle physics.

### v0.7.5

- Preserved the 1/240 s ordinary-time path while adding bounded, solver-safe high-speed advancement above 100x; unprocessed requested time remains queued and the HUD reports the effective rate.
- Increased the selectable trail capacity to 4,096 / 16,384 / 65,536 samples; only created particles own storage, and displacement-based sampling remains independent of solver substeps.
- Added a deterministic periapsis-precession demonstration preset and radial-period diagnostics without changing the Schwarzschild equations or initial-condition formulas.

### Deployment fixes

- Removed the duplicate repository-root GitHub Pages publisher that deployed the source `index.html` and caused `/src/main.js` to return 404.
- Standardized Pages publishing on the validated Vite `dist` artifact with the `/gr-simulator/` production base.

### Process

- Added a permanent release-validation matrix: full English plus targeted Korean visual checks for patches, and full bilingual checks for minor and major releases, with localization/layout exceptions.

### Added

- v0.7.4 preset and validated custom simulation time scales from `0.01×` through `100000×`.
- Centralized automatic, SI, and astronomical display-unit formatting for distance, velocity, mass, energy, and time.
- Persisted display-unit preference and boundary-focused unit/clock regression coverage.

- v0.7.3 normalized, physical, and auto-fit physical view modes backed by one centralized render transform.
- Persisted metres-per-world-unit controls, bilingual scale indicator, bounded mass comparison, and event-driven physical-scene fitting.
- Scale-transform unit, integration, UI, resource-stability, and browser regression coverage.

- v0.7.2 accessible control disclosures, bilingual in-app scientific guide, and contextual glossary.
- Three-step orbit setup with isolated drafts, inline validation, explicit apply feedback, and integration-default recovery.

### Changed

- HUD, orbit setup, scale indicator, and measurements now share one cached presentation formatter; canonical physics values remain SI.
- Particle, trail, and event-horizon presentation now share the exact same Schwarzschild-radius conversion; the geodesic solver and SI boundary are unchanged.
- The grid remains normalized and is explicitly disclosed as an educational proxy in physical views.

- Reorganized existing controls without changing physics equations, runtime defaults, camera, or rendering behavior.

### Fixed

- Added end-to-end motion diagnostics and regression coverage across the fixed simulation clock, Schwarzschild subsystem, canonical particle, immutable snapshot, and GPU particle-position buffer. The default `4×10⁶ M☉` real-time orbit remains physically unchanged; its approximately 74.3-minute proper-time period explains why brief `1×` observations appear stationary.

## [0.7.0] - 2026-08-05

### Added

- SI conversion boundary and a documented `r_s=2GM/c²`, `t_s=r_s/c` normalized convention.
- Equatorial massive-particle Schwarzschild geodesics with reusable RK4 storage, analytic initial-condition presets, capture/domain states, orbit classification, and conservation diagnostics.
- Particle/runtime/snapshot integration, bilingual orbit controls, scientific HUD, deterministic physics validation, and a solver microbenchmark.

### Changed

- The production default particle now follows the geodesic engine instead of legacy straight-line diagnostic motion.

### Scientific scope

- The simulator evaluates test-particle geodesics in a fixed analytic Schwarzschild spacetime. It does not solve the Einstein field equations and does not add Kerr, photons, self-gravity, radiation reaction, lensing, or arbitrary inclined planes.

## [0.6.2] - 2026-08-04

### Added

- Environment-aware Vite base-path configuration for GitHub Pages.
- Validated Pages artifact build and automatic deployment workflow.
- Deployment operations, local preview, repository setting, and custom-domain documentation.
- A finite simulation-domain contract derived from maximum mass 300, `10 r_s` orbital support, and a 1.25 safety margin.
- Uniform five-unit grid topology across the complete `[-75, 75]³` domain.
- Explicit `OutOfDomain` particle state with preserved last valid diagnostics and reset support.
- Independent 30/45/60/90/120/unlimited rendering-FPS control with persistence.
- Bounded development and soak diagnostics.

### Deployment scope

- No physics, particle, runtime, rendering, UI, or localization behavior changed.

### Changed

- Replaced rejected distance-based LOD, sparse far-field topology, and render-distance omission with fixed uniform-topology chunks using frustum-only visibility.
- Limited maximum camera distance to 120 units while preserving free interaction in the useful domain.
- Restricted particle/trail GPU uploads to used ranges and mapped speed brightness toward white.
- Changed the grid proxy palette from blue through cyan to red.
- Presented the event horizon as a translucent green rim shader and the body as an unlit black sphere.

### Removed

- Near-camera grid fading, including camera-distance opacity calculations and its visual controls.

### Scientific scope

- Raw displacement and speed values, the fixed 1/240-second simulation step, and all physics equations remain unchanged.
- No orbit classification or Schwarzschild geodesic behavior is implemented.

## [0.6.1] - 2026-08-04

### Added

- Explicit grid-deformation and particle-speed legends with localized labels.
- Separate English and Korean locale modules with key-parity tests.
- Configurable fixed trail capacities with allocation only when the setting changes.
- Visualization-transfer, far-field, source-policy, and version-consistency tests.

### Changed

- Made English the default locale while preserving valid saved locale choices.
- Expanded the grid from 24 to 240 world units with bounded adaptive far-field spacing.
- Applied a documented monotonic `asinh` display transfer without changing raw model values.
- Restricted trail coloring to measured speed and adopted a restrained blue-green scientific palette.

### Scientific scope

- No physics equation, runtime timing, particle dynamics, orbit model, or geodesic behavior was added or changed.

All notable changes to this project will be documented in this file. The format follows Keep a Changelog principles and the project intends to use semantic versioning as its public API matures.

## [0.6.0]

### Added

- Research-grade architecture, module-boundary, contribution, roadmap, and backlog documentation.
- Public module entry points for core, physics, rendering, and UI.
- Reserved HUD, systems, and utilities boundaries for staged future migration.
- Vitest and jsdom characterization tests for the current physics model and Store.
- Playwright browser smoke coverage for the v0.1 interaction baseline.
- ESLint quality checks and GitHub Actions verification.
- Performance baseline measurement documentation.
- Fixed-timestep SimulationClock and central SimulationState.
- Immutable double-buffered render snapshots.
- Ordered subsystem lifecycle and centralized resource ownership.
- Runtime engine tests and performance-assumption documentation.
- Fixed-capacity Particle data model and lifecycle manager.
- Per-particle fixed ring-buffer trails and selection API.
- Single-BufferGeometry particle renderer integrated with the runtime.
- Particle lifecycle, trail, selection, rendering, capacity, and buffer-reuse tests.
- Responsive scientific dashboard with top telemetry, simulation controls, visual settings, and status strip.
- GPU-material controls for particle, trail, grid, and mass presentation.
- Deterministic Single Color, Speed, Distance, and Age trail color modes.
- Mobile and tablet drawer navigation with keyboard focus management.
- Centralized Korean and English UI dictionaries with live, persisted language switching.
- Localization coverage for document metadata, accessibility labels, dashboard status, controls, help text, and responsive drawers.

### Changed

- Renamed the scene source boundary to rendering.
- Moved UI styles into the UI boundary.
- Updated the composition root to import through module entry points.
- Expanded the README with setup, architecture, research direction, and development principles.
- Increased default particle and trail readability while preserving pooled BufferGeometry rendering.
- Synchronized the application version to 0.6.0 and declared the Vite-compatible Node.js runtime requirement.

### Removed

- Nothing. Existing v0.1 features and behavior are preserved.

## [0.1.0] - 2026-07-28

### Added

- Initial Three.js volumetric-grid simulator.
- Schwarzschild model and educational W-axis effective-distance comparison.
- Interactive mass, W-axis, camera, and metrics controls.
