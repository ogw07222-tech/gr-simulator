# Scientific UI architecture

## Design language

The interface is an original scientific dashboard influenced by mission-control software and technical visualization tools. It does not reproduce artwork, icons, logos, or layouts from external references.

The visual hierarchy keeps the WebGL viewport dominant while presenting controls as compact instruments:

- top bar: identity, runtime state, FPS, frame time, and working viewport tools;
- left panel: runtime commands, time scale, physics inputs, and read-only metrics;
- center: uninterrupted camera surface with non-interactive context overlays;
- right panel: rendering preferences only;
- bottom strip: compact engine and model-scope status.

## Theme tokens

Theme values are CSS custom properties in `src/ui/main.css`. Primary tokens include near-black navy surfaces, translucent technical panels, low-contrast blue borders, cyan interaction accents, green running state, orange warnings, red destructive actions, and high-contrast neutral text.

Effects are deliberately restrained. Blur is limited to compact panels and overlays, removed on touch/narrow layouts, and transitions respect `prefers-reduced-motion`.

## Module boundaries

- `AppShell` owns dashboard chrome, responsive drawers, fullscreen, camera reset, panel visibility, and throttled top-bar telemetry.
- `ControlPanel` owns existing runtime commands, physics input commands, and current metric projection.
- `VisualSettingsPanel` owns presentation preferences and forwards them only to rendering objects.
- `ParticleRenderer`, `VolumetricGrid`, and `MassObject` apply material/object presentation changes without mutating simulation or physics state.

No frontend framework or secondary runtime state store is introduced.

## Localization

`src/ui/i18n.js` is the locale facade and exposes `getLocale()`, `setLocale(locale)`, `t(key)`, and `subscribeLocale(listener)`. The complete dictionaries are isolated in `src/ui/i18n/en.js` and `src/ui/i18n/ko.js`. English is the default. A supported previous choice is restored from localStorage key `gr4d.locale`; invalid values fall back to English.

Components render and bind events once, then subscribe to locale changes. Switching language updates text nodes, option labels, document metadata, and ARIA attributes in place. It does not rebuild the application or modify runtime, particle, camera, physics, or rendering state.

Translation keys are grouped by stable domains such as `app.*`, `status.*`, `controls.*`, `panels.*`, `visual.*`, and `camera.*`. A new language must provide the complete key set, be added to `SUPPORTED_LOCALES`, and receive a visible selector label. `GR-4D Simulator`, FPS, GR, GPU, scientific units, and mathematical symbols remain unchanged where they are established technical notation.

## Supported visual settings

- particle point size, opacity, and material brightness;
- trail visibility, opacity, brightness, age fade, speed legend, and fixed capacity;
- grid visibility, opacity, and brightness;
- maximum rendering FPS;
- event-horizon opacity and rim intensity.

Trail and particle color communicate only current speed in simulation world units per second through monotonically increasing brightness from subdued blue-gray to white. Capacity choices are bounded typed buffers: desktop defaults to 1,024 samples and mobile defaults to 512. A capacity change reallocates once through the manager and renderer; animation-loop updates allocate nothing.

Grid deformation uses a separate raw-value legend and identifies the `asinh` display transfer. Blue marks the minimum displayed deformation, cyan the middle, and red the maximum. This is an educational proxy palette, not curvature.

The FPS selector persists under `gr4d.maxFps`; `0` means unlimited. It schedules rendering from requestAnimationFrame timestamps while SimulationClock continues to own the fixed 1/240-second physics step. Hidden tabs discard elapsed render/simulation backlog before restoration.

Reset Visuals restores the 60 FPS rendering cap without resetting simulation, particles, trails, camera, or locale. The complete supported grid domain retains uniform visibility and quality.

## Responsive behavior

Desktop displays both side panels. Tablet and mobile convert them into slide-over drawers opened from the top bar. Drawer focus moves to the first actionable control, Escape closes an open drawer, touch targets are at least 44 px, and the backdrop leaves the viewport unobstructed when drawers are closed.

## Unsupported future controls

The UI intentionally omits arbitrary thick 3D lines, fake bloom without post-processing, Energy/Proper Time/Curvature coloring, orbit analytics, and scientific particle inspection. These controls require corresponding tested engine data or rendering capabilities.

## v0.7 orbit controls and HUD

The simulation panel adds bilingual basic and advanced orbit setup. Input edits remain draft DOM state; Apply validates mass, radius, local subluminal velocity, conserved quantities, and substep bounds before atomically replacing the solver state. Language switching only replaces localized text and preserves the active orbit, camera, runtime, and draft values.

The scientific HUD consumes reusable snapshots and refreshes text at no more than 10 Hz. It distinguishes SI from normalized quantities and labels local static-observer speed explicitly. At capture the last outside-horizon value is retained; no inside-horizon local-static speed is presented.
