# GR-4D Simulator

A browser-based General Relativity visualization laboratory built with Three.js. Version 0.6 presents the existing Schwarzschild spatial-slice and particle runtime through a responsive scientific dashboard.

> This project is not yet a numerical Einstein field equation solver. The current implementation combines quantities derived from the Schwarzschild metric with explicitly documented weak-field visualization approximations.

## Current capabilities

- Three.js volumetric grid visualization
- Single Schwarzschild mass and event-horizon representation
- Schwarzschild radius, lapse, and curvature proxy metrics
- GR 3D and GR + W effective-distance comparison
- Real-time mass and W-axis controls
- OrbitControls camera navigation
- Fixed-timestep runtime controls and one default test particle
- GPU-buffered particle trail rendering
- Responsive simulation and visual-settings panels
- Presentation-only particle, trail, grid, and mass-rendering controls
- Live Korean/English interface switching with persisted language preference
- Explicit cleanup of renderer, controls, geometry, material, and subscriptions

## Quick start

Requirements: Node.js 20.19 or newer (or Node.js 22.12+) and npm.

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

For a local production preview that is reachable outside the local machine:

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

`vite preview` is a local verification server, not the production hosting server.

## Deployment

The expected production URL is [https://ogw07222-tech.github.io/gr-simulator/](https://ogw07222-tech.github.io/gr-simulator/). Pushes to `main` automatically run lint, unit tests, a production build, artifact upload, and deployment through the **Deploy GitHub Pages** workflow. A deployment is successful only after both workflow jobs complete successfully.

Deployment status and logs are available in the repository's **Actions** tab. The same workflow can be rerun with **Run workflow**. The repository owner must select **Settings → Pages → Build and deployment → Source → GitHub Actions** once before the first deployment.

GitHub Pages serves this repository from `/gr-simulator/`. The deployment workflow enables that Vite base path while localhost and Codespaces retain `/`. See [Deployment](docs/DEPLOYMENT.md) for validation, local Pages preview, permissions, and future custom-domain guidance.

The first browser-smoke run requires `npx playwright install chromium`. Unit tests use Vitest with jsdom; browser smoke tests run the actual application in Chromium.

## Controls

- Drag: rotate camera
- Right-drag: pan camera
- Mouse wheel: zoom
- GR 3D / GR + W: select the effective-distance model
- Mass M / W-axis distance: update simulation inputs
- Play / Pause / Time Scale: control the existing fixed-step runtime
- Reset Particle / Reset All: restore particle or complete runtime time state
- Visual Settings: adjust rendering materials without changing simulation state
- Reset Camera / Fullscreen / Hide Panels: manage the scientific workspace
- 한국어 / English: switch the complete interface language without resetting simulation, camera, or visual state

## Localization

English (`en`) is the default interface language. Korean (`ko`) remains fully supported. The language selector restores a valid previous choice from the `gr4d.locale` localStorage key; invalid values fall back to English. Locale dictionaries live in `src/ui/i18n/en.js` and `src/ui/i18n/ko.js`, while `src/ui/i18n.js` provides the stable runtime API. Switching language updates document metadata, visible labels, and accessibility text without reloading or resetting simulation state.

Translations use stable keys in `src/ui/i18n.js`. To add a language, add a complete dictionary matching the existing `ko` and `en` keys, register its locale code in `SUPPORTED_LOCALES`, and add the selector label. Project name, FPS, GR, GPU, scientific units, and mathematical symbols remain untranslated where appropriate.

## Scientific dashboard

The v0.6.1 interface uses an original scientific-dashboard design language: compact telemetry, restrained holographic blue-green accents, a viewport-first layout, and separate simulation and presentation controls. Grid deformation and trail speed include explicit legends. Desktop uses persistent side panels; tablet and mobile use keyboard- and touch-accessible drawers.

The grid spans a larger adaptive world-space domain. Its dense central region preserves detail while geometrically increasing far-field spacing keeps geometry bounded. Raw model displacement is retained unchanged; a documented `asinh` transfer is applied only to display magnitude. Particle trails use a fixed configurable capacity, resize only when the setting changes, and are colored only by measured particle speed.

Screenshots are maintained in `docs/screenshots/` for desktop, tablet, and mobile verification. See [UI architecture](docs/UI_ARCHITECTURE.md) for theme tokens, supported visual settings, responsive behavior, and intentionally unsupported controls.

| Desktop | Tablet portrait | Mobile portrait |
| --- | --- | --- |
| ![Desktop scientific dashboard](docs/screenshots/desktop.png) | ![Tablet viewport layout](docs/screenshots/tablet.png) | ![Mobile viewport layout](docs/screenshots/mobile.png) |

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
- [UI architecture](docs/UI_ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
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
