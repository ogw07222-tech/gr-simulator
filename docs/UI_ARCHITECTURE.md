# Scientific UI architecture

## v0.7.4 scientific display settings

Visual Settings owns the presentation-unit selector. `UnitFormatter` publishes mode changes to existing panels and the scale indicator without rebuilding the application, resetting runtime state, or replacing event handlers. Unit names and setting labels are localized; international symbols such as SI, AU, `c`, and `M☉` remain stable.

The runtime time-scale control combines preserved presets with high-speed presets and a validated custom field. It delegates directly to `SimulationClock`; changing the multiplier has no particle, trail, camera, or orbit-reset side effect.

## v0.7.2 interaction layer

- `ControlPanel` and `VisualSettingsPanel` group existing controls with native `details/summary` disclosures. Simulation and orbit setup open initially; numerical integration stays collapsed.
- `UserGuide` is an AppShell-owned bilingual dialog. It updates in place on locale changes, traps focus, closes with Escape, and restores focus without recreating the simulation.
- `ScientificHelp` provides one reusable contextual popover for all `data-help-key` triggers. Definitions remain centralized in the locale dictionaries.
- Orbit fields remain drafts until `applyOrbit` validates and applies the complete configuration atomically. Locale, camera, runtime, particle, and rendering state are not rebuilt.
- Long-form reference lives in `docs/USER_GUIDE.md` and `docs/GLOSSARY.md`.

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

### Visual validation cadence

Patch releases in the `0.x.y` series perform the complete responsive/manual matrix in English and retain automated Korean/English key parity, string tests, and builds. Korean visual checks target only changed localized surfaces unless the patch affects localization, typography, wrapping, localized help content, locale state, or responsive layout broadly. Minor transitions to `0.(x+1).0` and the future major transition to `1.0.0` require the complete responsive/manual matrix in both languages. This policy reduces repeated screenshots; it never removes Korean functional automation.

## Supported visual settings

The Scale and View disclosure owns presentation-only settings persisted at `gr4d.renderScale`: view mode, metres per world unit, scale-indicator visibility, and normalized-grid visibility in physical modes. All labels, tooltips, comparison text, and mode names are present in both locale dictionaries. Locale and scale switches update the existing DOM and buffers without rebuilding the application or resetting simulation, particle, trail, camera, or orbit state.

Auto-fit is an explicit event response, not continuous camera control. The scale indicator reports the active convention, Schwarzschild radius in kilometres, current particle radius in both `r_s` and kilometres, and render-space horizon radius. A bounded previous/current comparison appears after an applied mass change and can be dismissed.

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

The UI intentionally omits arbitrary thick 3D lines, fake bloom without post-processing, Energy/Proper Time/Curvature coloring, orbit analytics, and unsupported derived physics overlays. These controls require corresponding tested engine data or rendering capabilities.

## v0.7 orbit controls and HUD

The simulation panel adds bilingual basic and advanced orbit setup. Input edits remain draft DOM state; Apply validates mass, radius, local subluminal velocity, conserved quantities, and substep bounds before atomically replacing the solver state. Language switching only replaces localized text and preserves the active orbit, camera, runtime, and draft values.

The scientific HUD consumes reusable snapshots and refreshes text at no more than 10 Hz. It distinguishes SI from normalized quantities and labels local static-observer speed explicitly. At capture the last outside-horizon value is retained; no inside-horizon local-static speed is presented.

## v0.7.11 Particle Inspector

`ParticleInspector` owns selection as UI state, separate from `Particle` and the Schwarzschild solver. It creates one HTML overlay and reuses it for the lifetime of the app. Pointer down/up displacement distinguishes taps/clicks from OrbitControls drags, and screen-space hit testing slightly expands only the interaction target without enlarging rendered particles.

The inspector reads the existing immutable presentation snapshot plus authoritative particle state. Radial/tangential local velocity fractions are exposed by `SchwarzschildParticleSubsystem.writeSnapshot()` from values it already computes; the inspector does not integrate, classify, or derive a second physics model. Render-space particle coordinates are projected with a reused Three.js vector. Card dimensions remain CSS-pixel sized at all camera distances and scale modes.

When an in-front particle leaves the viewport, the same selection is represented by a clamped edge indicator. Behind-camera points are detected in camera space before perspective projection, so no mirrored or fabricated screen coordinate is used. The edge action delegates to the existing `Renderer.focusPoint()` behavior. Selection is not dropped for camera distance, apparent size, trail distance, render scale, or grid distance.

This patch does not add full-scene occlusion testing. The inspector can therefore remain visible when the selected particle is geometrically behind the black-hole presentation object from the current camera view; adding a depth/occlusion system is intentionally outside this focused interaction patch.
