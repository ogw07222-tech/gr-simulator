import "./ui/main.css";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS, Store } from "./core/index.js";
import { SchwarzschildModel } from "./physics/index.js";
import { MassObject, Renderer, VolumetricGrid } from "./rendering/index.js";
import {
  ResourceManager,
  ParticleManager,
  ParticleRenderer,
  SimulationClock,
  SimulationState,
  TIME_SCALES,
  SnapshotManager,
  SubsystemManager,
} from "./systems/index.js";
import { ControlPanel } from "./ui/index.js";

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
}));
const massObject = resources.register(new MassObject());
const particles = resources.register(new ParticleManager({
  maxParticles: 1000,
  maxTrailLength: 256,
}));
const particleRenderer = resources.register(new ParticleRenderer({
  maxParticles: particles.maxParticles,
  maxTrailLength: particles.maxTrailLength,
}));
renderer.add(grid.object);
renderer.add(massObject.group);
renderer.add(particleRenderer.object);
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

const snapshotSource = { mass: 0, schwarzschildRadius: 0 };
let state = store.getState();
const applyState = (nextState) => {
  state = nextState;
  grid.update(model, state);
  snapshotSource.mass = state.mass;
  snapshotSource.schwarzschildRadius = model.schwarzschildRadius(state.mass);
  snapshots.publish(snapshotSource);
};
resources.register(store.subscribe(applyState));
applyState(state);

const renderingSubsystem = {
  order: 100,
  render() {
    const snapshot = snapshots.latest();
    massObject.updateSchwarzschildRadius(snapshot.schwarzschildRadius);
    renderer.render();
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
function updateSimulation(delta, runtimeState) {
  subsystems.update(delta, runtimeState, snapshots.latest());
}

function animate(timestamp) {
  animationId = requestAnimationFrame(animate);
  clock.tick(timestamp, updateSimulation);
  subsystems.render(clock.renderDelta, simulationState, snapshots.latest());
}

function dispose() {
  cancelAnimationFrame(animationId);
  clock.stop();
  subsystems.dispose();
  resources.disposeAll();
}

resources.register(window, () => window.removeEventListener("beforeunload", dispose));
window.addEventListener("beforeunload", dispose);
clock.start();
animationId = requestAnimationFrame(animate);
