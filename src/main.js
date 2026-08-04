import "./ui/main.css";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS, TRAIL_CAPACITY, Store } from "./core/index.js";
import { SchwarzschildModel } from "./physics/index.js";
import { MassObject, Renderer, VolumetricGrid } from "./rendering/index.js";
import {
  ResourceManager,
  FrameRateController,
  ParticleManager,
  ParticleRenderer,
  SimulationClock,
  SimulationState,
  TIME_SCALES,
  SnapshotManager,
  SubsystemManager,
} from "./systems/index.js";
import { AppShell, ControlPanel, VisualSettingsPanel } from "./ui/index.js";

function createRenderSnapshotBuffer() {
  const data = { mass: 0, schwarzschildRadius: 0 };
  const view = Object.freeze({
    get mass() { return data.mass; },
    get schwarzschildRadius() { return data.schwarzschildRadius; },
  });
  return { data, view };
}

function copyRenderSnapshot(target, source) {
  target.mass = source.mass;
  target.schwarzschildRadius = source.schwarzschildRadius;
}

const resources = new ResourceManager();
const simulationState = new SimulationState();
const clock = new SimulationClock({ state: simulationState });
const frameRateController = new FrameRateController();
const snapshots = new SnapshotManager({
  createBuffer: createRenderSnapshotBuffer,
  copy: copyRenderSnapshot,
});

const store = new Store(SIMULATION_DEFAULTS);
const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
const renderer = resources.register(new Renderer(document.querySelector("#viewport")));
const grid = resources.register(new VolumetricGrid({
  size: SIMULATION_DEFAULTS.gridSize,
  divisions: SIMULATION_DEFAULTS.gridDivisions,
  nearExtent: SIMULATION_DEFAULTS.gridNearExtent,
  farSpacingRatio: SIMULATION_DEFAULTS.gridFarSpacingRatio,
}));
const massObject = resources.register(new MassObject());
const mobileLayout = window.matchMedia("(max-width: 820px)").matches;
const trailCapacityOptions = mobileLayout ? TRAIL_CAPACITY.mobileOptions : TRAIL_CAPACITY.desktopOptions;
const initialTrailCapacity = mobileLayout ? TRAIL_CAPACITY.mobile : TRAIL_CAPACITY.desktop;
const particles = resources.register(new ParticleManager({
  maxParticles: 1000,
  maxTrailLength: initialTrailCapacity,
}));
const particleRenderer = resources.register(new ParticleRenderer({
  maxParticles: particles.maxParticles,
  maxTrailLength: particles.maxTrailLength,
}));
renderer.add(grid.object);
renderer.add(massObject.group);
renderer.add(particleRenderer.object);
renderer.add(particleRenderer.haloObject);
renderer.add(particleRenderer.trailObject);

const defaultParticle = particles.create({
  id: "default-particle",
  position: [4, 1.5, 0],
  velocity: [0, 0, 0.75],
  restMass: 1,
  radius: 0.22,
  color: 0xffd166,
});

const runtimeControls = {
  timeScales: TIME_SCALES,
  play: () => clock.resume(),
  pause: () => clock.pause(),
  setTimeScale: (scale) => clock.setTimeScale(scale),
  resetParticle: () => particles.reset(defaultParticle.id),
  resetAll: () => {
    clock.reset();
    particles.reset();
  },
};

const controlPanel = resources.register(new ControlPanel(
  document.querySelector("#control-panel"),
  store,
  model,
  grid,
  runtimeControls,
));
const visualSettings = resources.register(new VisualSettingsPanel(
  document.querySelector("#visual-settings-panel"),
  {
    particleRenderer,
    grid,
    massObject,
    frameRateController,
    trailCapacity: {
      current: initialTrailCapacity,
      options: trailCapacityOptions,
      resize: (capacity) => {
        particles.resizeTrailCapacity(capacity);
        particleRenderer.resizeTrailCapacity(capacity);
      },
    },
  },
));
const appShell = resources.register(new AppShell(
  document.querySelector("#app"),
  { resetCamera: () => renderer.resetCamera() },
));

const snapshotSource = { mass: 0, schwarzschildRadius: 0 };
let state = store.getState();
const applyState = (nextState) => {
  state = nextState;
  grid.update(model, state);
  visualSettings.updateLegends();
  snapshotSource.mass = state.mass;
  snapshotSource.schwarzschildRadius = model.schwarzschildRadius(state.mass);
  snapshots.publish(snapshotSource);
};
resources.register(store.subscribe(applyState));
applyState(state);

const renderingSubsystem = {
  order: 100,
  render(renderDelta) {
    const snapshot = snapshots.latest();
    massObject.updateSchwarzschildRadius(snapshot.schwarzschildRadius);
    renderer.render(prepareGridView);
    appShell.update(renderDelta, simulationState);
  },
};

const particleSubsystem = {
  order: 50,
  update(delta) {
    particles.update(delta);
  },
  render() {
    particleRenderer.sync(particles);
    controlPanel.syncRuntime(simulationState, particles.count());
  },
};

const subsystems = new SubsystemManager([particleSubsystem, renderingSubsystem]);
subsystems.initialize({ resources, snapshots, store });

let animationId;
let disposed = false;
const runtimeDiagnostics = { animationFrames: 0, renderedFrames: 0 };
function prepareGridView(camera) { grid.updateView(camera); }
function updateSimulation(delta, runtimeState) {
  subsystems.update(delta, runtimeState, snapshots.latest());
}

function animate(timestamp) {
  animationId = requestAnimationFrame(animate);
  runtimeDiagnostics.animationFrames += 1;
  if (document.hidden) {
    clock.synchronize(timestamp);
    frameRateController.shouldRender(timestamp, true);
    return;
  }
  clock.tick(timestamp, updateSimulation);
  if (!frameRateController.shouldRender(timestamp)) return;
  runtimeDiagnostics.renderedFrames += 1;
  subsystems.render(frameRateController.renderDelta, simulationState, snapshots.latest());
}

function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(animationId);
  clock.stop();
  subsystems.dispose();
  resources.disposeAll();
}

resources.register(window, () => window.removeEventListener("beforeunload", dispose));
window.addEventListener("beforeunload", dispose);
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.__GR4D_DIAGNOSTICS__ = Object.freeze({
  getSnapshot() {
    return {
      animationFrames: runtimeDiagnostics.animationFrames,
      renderedFrames: runtimeDiagnostics.renderedFrames,
      simulationDelta: clock.simulationDelta,
      maxFps: frameRateController.maxFps,
      grid: { ...grid.getDiagnostics() },
      renderer: { ...renderer.getDiagnostics() },
    };
  },
});
clock.start();
animationId = requestAnimationFrame(animate);
