# GR-4D Simulator

A browser-based General Relativity visualization laboratory built with Three.js. The current v0.1 release visualizes a Schwarzschild spatial slice and compares ordinary 3D distance with an educational W-axis effective-distance model.

> This project is not yet a numerical Einstein field equation solver. The current implementation combines quantities derived from the Schwarzschild metric with explicitly documented weak-field visualization approximations.

## Current capabilities

- Three.js volumetric grid visualization
- Single Schwarzschild mass and event-horizon representation
- Schwarzschild radius, lapse, and curvature proxy metrics
- GR 3D and GR + W effective-distance comparison
- Real-time mass and W-axis controls
- OrbitControls camera navigation
- Explicit cleanup of renderer, controls, geometry, material, and subscriptions

## Quick start

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run lint
npm run test
npm run build
npm run test:smoke
npm run preview
```

The first browser-smoke run requires `npx playwright install chromium`. Unit tests use Vitest with jsdom; browser smoke tests run the actual application in Chromium.

## Controls

- Drag: rotate camera
- Right-drag: pan camera
- Mouse wheel: zoom
- GR 3D / GR + W: select the effective-distance model
- Mass M / W-axis distance: update simulation inputs

## Architecture

```text
src/
├─ core/       # Configuration, state, shared runtime primitives
├─ physics/    # Framework-independent physical models
├─ rendering/  # Three.js renderer and scene representations
├─ ui/         # Interactive controls and presentation styles
├─ hud/        # Read-only metrics projection boundary
├─ systems/    # Lifecycle, clocks, and orchestration boundary
├─ utils/      # Small framework-independent helpers
└─ main.js     # Composition root
```

Each directory exposes or reserves a clear dependency boundary. Existing v0.1 behavior remains assembled in `main.js`; future migrations will move orchestration behind systems only after regression tests exist. See [Architecture](docs/ARCHITECTURE.md) and [Module Boundaries](docs/MODULES.md).

## Research direction

The long-term goal is a reproducible, testable, performance-oriented GR simulation platform. Physical observables, educational proxies, and visual effects must remain separately named and validated. Numerical methods will be introduced only with reference cases, error bounds, and benchmark budgets.

## Project documentation

- [Physics model](docs/PHYSICS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Module boundaries](docs/MODULES.md)
- [Runtime engine](docs/RUNTIME_ENGINE.md)
- [Particle engine](docs/PARTICLE_ENGINE.md)
- [Contributing](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)
- [Task backlog](TODO.md)
- [Changelog](CHANGELOG.md)

## Development principles

- Preserve existing behavior and public interactions.
- Prefer measured performance work over speculative rewrites.
- Keep physics independent from Three.js and the DOM.
- Avoid per-frame allocations in performance-critical paths.
- Require deterministic tests and documented tolerances for numerical changes.
- Make ownership and disposal explicit for every runtime resource.

## License

[MIT](LICENSE)
