# Changelog

## Unreleased

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
