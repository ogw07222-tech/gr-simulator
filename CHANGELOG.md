# Changelog

All notable changes to this project will be documented in this file. The format follows Keep a Changelog principles and the project intends to use semantic versioning as its public API matures.

## [Unreleased]

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
