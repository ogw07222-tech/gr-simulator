# Module Boundaries

## `core`

Owns configuration, state primitives, shared contracts, and later clock/event abstractions. It must remain independent of DOM and Three.js.

## `physics`

Owns equations, unit policies, numerical models, solvers, batch sampling, and immutable snapshots. It exposes deterministic inputs and outputs to the rest of the application.

## `rendering`

Owns Three.js renderer integration, GPU resources, scene representations, and visual synchronization. Resource creation and disposal remain paired.

## `ui`

Owns interactive controls, input validation, accessible DOM behavior, and control styles. UI translates user intent into commands.

## `hud`

Owns read-only selectors, metric formatting, and diagnostic views. HUD refresh rates may be lower than render rates and must not mutate simulation state.

## `systems`

Owns SimulationClock, SimulationState, SnapshotManager, ResourceManager, SubsystemManager, and application orchestration. Rendering and future evolving systems use this shared lifecycle.

## `utils`

Owns small framework-independent helpers shared by multiple boundaries. Physics-specific or rendering-specific behavior stays in the relevant domain module.

## Import policy

Consumers import from a directory's `index.js` when a public entry point exists. Deep imports are reserved for code within the same boundary. New cross-boundary dependencies must preserve the direction documented in `ARCHITECTURE.md`.
