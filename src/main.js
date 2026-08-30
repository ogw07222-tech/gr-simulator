import "./ui/main.css";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS, SIMULATION_DOMAIN, TRAIL_CAPACITY } from "./core/index.js";
import { SchwarzschildModel } from "./physics/index.js";
import { MassObject, RenderScaleMode, RenderScaleTransform, Renderer, VolumetricGrid } from "./rendering/index.js";
import {
  ResourceManager,
  FrameRateController,
  ParticleManager,
  ParticleRenderer,
  PhotonRenderer,
  PhotonSubsystem,
  SchwarzschildParticleSubsystem,
  SimulationClock,
  SimulationState,
  TIME_SCALES,
  SnapshotManager,
  SubsystemManager,
} from "./systems/index.js";
import { AppShell, ControlPanel, ParticleInspector, PhotonControls, ScaleIndicator, VisualSettingsPanel } from "./ui/index.js";
import { UnitFormatter } from "./ui/units/index.js";
import { getLocale } from "./ui/i18n.js";

function createRenderSnapshotBuffer() {
  const data = {
    mass: 0, schwarzschildRadius: 0, geodesicStatus: "", orbitClassification: "",
    massSolar: 0, massKg: 0, schwarzschildRadiusMetres: 0, radiusRs: 0, radiusMetres: 0,
    coordinateTime: 0, properTime: 0, localSpeedFraction: 0, localSpeedMetresPerSecond: 0,
    radialSpeedFraction: 0, tangentialSpeedFraction: 0,
    energy: 0, angularMomentum: 0, angularMomentumSI: 0, energyDrift: 0,
    angularMomentumDrift: 0, normalizationResidual: 0, integrationSubsteps: 0,
    minimumRadiusRs: 0, maximumRadiusRs: 0, radialPeriods: 0,
    periapsisRadiusRs: Number.NaN, apocenterRadiusRs: Number.NaN,
    normalizedX: 0, normalizedY: 0, normalizedZ: 0, renderX: 0, renderY: 0, renderZ: 0,
  };
  const view = Object.freeze({
    get mass() { return data.mass; },
    get schwarzschildRadius() { return data.schwarzschildRadius; },
    get geodesicStatus() { return data.geodesicStatus; },
    get orbitClassification() { return data.orbitClassification; },
    get massSolar() { return data.massSolar; },
    get massKg() { return data.massKg; },
    get schwarzschildRadiusMetres() { return data.schwarzschildRadiusMetres; },
    get radiusRs() { return data.radiusRs; },
    get radiusMetres() { return data.radiusMetres; },
    get coordinateTime() { return data.coordinateTime; },
    get properTime() { return data.properTime; },
    get localSpeedFraction() { return data.localSpeedFraction; },
    get localSpeedMetresPerSecond() { return data.localSpeedMetresPerSecond; },
    get radialSpeedFraction() { return data.radialSpeedFraction; },
    get tangentialSpeedFraction() { return data.tangentialSpeedFraction; },
    get energy() { return data.energy; },
    get angularMomentum() { return data.angularMomentum; },
    get angularMomentumSI() { return data.angularMomentumSI; },
    get energyDrift() { return data.energyDrift; },
    get angularMomentumDrift() { return data.angularMomentumDrift; },
    get normalizationResidual() { return data.normalizationResidual; },
    get integrationSubsteps() { return data.integrationSubsteps; },
    get minimumRadiusRs() { return data.minimumRadiusRs; },
    get maximumRadiusRs() { return data.maximumRadiusRs; },
    get radialPeriods() { return data.radialPeriods; },
    get periapsisRadiusRs() { return data.periapsisRadiusRs; },
    get apocenterRadiusRs() { return data.apocenterRadiusRs; },
    get normalizedX() { return data.normalizedX; },
    get normalizedY() { return data.normalizedY; },
    get normalizedZ() { return data.normalizedZ; },
    get renderX() { return data.renderX; },
    get renderY() { return data.renderY; },
    get renderZ() { return data.renderZ; },
  });
  return { data, view };
}

function copyRenderSnapshot(target, source) {
  target.mass = source.mass;
  target.schwarzschildRadius = source.schwarzschildRadius;
  target.geodesicStatus = source.geodesicStatus;
  target.orbitClassification = source.orbitClassification;
  target.massSolar = source.massSolar;
  target.massKg = source.massKg;
  target.schwarzschildRadiusMetres = source.schwarzschildRadiusMetres;
  target.radiusRs = source.radiusRs;
  target.radiusMetres = source.radiusMetres;
  target.coordinateTime = source.coordinateTime;
  target.properTime = source.properTime;
  target.localSpeedFraction = source.localSpeedFraction;
  target.localSpeedMetresPerSecond = source.localSpeedMetresPerSecond;
  target.radialSpeedFraction = source.radialSpeedFraction;
  target.tangentialSpeedFraction = source.tangentialSpeedFraction;
  target.energy = source.energy;
  target.angularMomentum = source.angularMomentum;
  target.angularMomentumSI = source.angularMomentumSI;
  target.energyDrift = source.energyDrift;
  target.angularMomentumDrift = source.angularMomentumDrift;
  target.normalizationResidual = source.normalizationResidual;
  target.integrationSubsteps = source.integrationSubsteps;
  target.minimumRadiusRs = source.minimumRadiusRs;
  target.maximumRadiusRs = source.maximumRadiusRs;
  target.radialPeriods = source.radialPeriods;
  target.periapsisRadiusRs = source.periapsisRadiusRs;
  target.apocenterRadiusRs = source.apocenterRadiusRs;
  target.normalizedX = source.normalizedX;
  target.normalizedY = source.normalizedY;
  target.normalizedZ = source.normalizedZ;
  target.renderX = source.renderX;
  target.renderY = source.renderY;
  target.renderZ = source.renderZ;
}

const resources = new ResourceManager();
const simulationState = new SimulationState();
const clock = new SimulationClock({ state: simulationState });
const frameRateController = new FrameRateController();
const snapshots = new SnapshotManager({
  createBuffer: createRenderSnapshotBuffer,
  copy: copyRenderSnapshot,
});

const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
const renderer = resources.register(new Renderer(document.querySelector("#viewport")));
const grid = resources.register(new VolumetricGrid({
  size: SIMULATION_DEFAULTS.gridSize,
  spacing: SIMULATION_DEFAULTS.gridSpacing,
}));
const massObject = resources.register(new MassObject());
const scaleTransform = new RenderScaleTransform();
const mobileLayout = window.matchMedia("(max-width: 820px)").matches;
const trailCapacityOptions = mobileLayout ? TRAIL_CAPACITY.mobileOptions : TRAIL_CAPACITY.desktopOptions;
const initialTrailCapacity = mobileLayout ? TRAIL_CAPACITY.mobile : TRAIL_CAPACITY.desktop;
const particles = resources.register(new ParticleManager({
  maxParticles: 1000,
  maxTrailLength: initialTrailCapacity,
  domainHalfExtent: SIMULATION_DOMAIN.halfExtent,
}));
const particleRenderer = resources.register(new ParticleRenderer({
  maxParticles: particles.maxParticles,
  maxTrailParticles: 1,
  maxTrailLength: particles.maxTrailLength,
  scaleTransform,
}));
const photonRenderer = resources.register(new PhotonRenderer({
  maxPhotons: 64,
  maxTrailLength: 128,
  pointSize: 8,
  scaleTransform,
}));
renderer.add(grid.object);
renderer.add(massObject.group);
renderer.add(particleRenderer.object);
renderer.add(particleRenderer.haloObject);
renderer.add(particleRenderer.trailObject);
renderer.add(photonRenderer.markerObject);
renderer.add(photonRenderer.trailObject);

const geodesicSubsystem = new SchwarzschildParticleSubsystem({ particles });
clock.setHighSpeedDelta(geodesicSubsystem.maximumSafeAdvanceSeconds());
const unitFormatter = new UnitFormatter({ locale: getLocale });
const scaleIndicator = resources.register(new ScaleIndicator(
  document.querySelector("#viewport-shell"), scaleTransform, unitFormatter,
));
const photonSubsystem = new PhotonSubsystem({
  massSolar: geodesicSubsystem.configuration.massSolar,
  maxTrailLength: photonRenderer.maxTrailLength,
  renderer: photonRenderer,
});
const particleInspector = resources.register(new ParticleInspector(
  document.querySelector("#viewport-shell"),
  {
    renderer, particleRenderer, particles, photonRenderer, photons: photonSubsystem, unitFormatter,
    snapshotParticleId: geodesicSubsystem.particleId,
    focusParticle: (x, y, z) => renderer.focusPoint(x, y, z),
  },
));
resources.register(new PhotonControls(
  document.querySelector("#viewport-shell"),
  {
    enabled: photonSubsystem.enabled,
    count: photonSubsystem.count(),
    onToggle: (enabled) => photonSubsystem.setEnabled(enabled),
    onCount: (count) => photonSubsystem.setCount(count),
    onPreset: (preset) => { photonSubsystem.applyPreset(preset); return photonSubsystem.configuration; },
    onApply: (configuration) => { photonSubsystem.apply(configuration); return photonSubsystem.configuration; },
    onDemo: () => { photonSubsystem.applyLightBendingDemo(); return { configuration: photonSubsystem.configuration, count: photonSubsystem.count() }; },
    getConfiguration: () => photonSubsystem.configuration,
    getCount: () => photonSubsystem.count(),
  },
));

const snapshotRenderPosition = { x: 0, y: 0, z: 0 };
const snapshotSource = { mass: 0, schwarzschildRadius: 0 };
const gridInputs = { ...SIMULATION_DEFAULTS, massSolar: 0, renderScale: 1, visualDeformationGain: 1 };
let lastMassScaleRevision = -1;
function refreshPresentationSnapshot(forceIndicator = false) {
  geodesicSubsystem.writeSnapshot(snapshotSource);
  snapshotSource.mass = snapshotSource.massSolar;
  snapshotSource.schwarzschildRadius = 1;
  snapshotSource.normalizedX = snapshotSource.renderX;
  snapshotSource.normalizedY = snapshotSource.renderY;
  snapshotSource.normalizedZ = snapshotSource.renderZ;
  scaleTransform.setSchwarzschildRadiusMetres(snapshotSource.schwarzschildRadiusMetres);
  scaleTransform.writeCartesian(
    snapshotRenderPosition,
    snapshotSource.normalizedX, snapshotSource.normalizedY, snapshotSource.normalizedZ,
  );
  snapshotSource.renderX = snapshotRenderPosition.x;
  snapshotSource.renderY = snapshotRenderPosition.y;
  snapshotSource.renderZ = snapshotRenderPosition.z;
  const snapshot = snapshots.publish(snapshotSource);
  if (lastMassScaleRevision !== scaleTransform.revision()) {
    massObject.updateRenderScale(scaleTransform);
    lastMassScaleRevision = scaleTransform.revision();
  }
  scaleIndicator.update(snapshot, forceIndicator);
  return snapshot;
}

function fitPhysicalScene() {
  const snapshot = snapshots.latest();
  if (!snapshot || snapshot.schwarzschildRadiusMetres <= 0 || !scaleTransform.isPhysical()) return false;
  const normalizedExtent = Math.max(1, snapshot.radiusRs, snapshot.maximumRadiusRs);
  return renderer.fitPhysicalScene(scaleTransform.normalizedRadiusToRender(normalizedExtent), 1.25);
}

function ensureCurrentSceneVisible(snapshot) {
  if (!snapshot?.schwarzschildRadiusMetres) return false;
  const normalizedExtent = Math.max(1, snapshot.radiusRs, snapshot.maximumRadiusRs);
  const renderScale = scaleTransform.isPhysical() ? scaleTransform.scaleFactor : 1;
  renderer.updatePresentationScale(renderScale);
  return renderer.ensureSceneVisible(
    scaleTransform.isPhysical() ? scaleTransform.normalizedRadiusToRender(normalizedExtent) : normalizedExtent,
    scaleTransform.isPhysical() ? scaleTransform.horizonRenderRadius() : 1,
  );
}

const runtimeControls = {
  timeScales: TIME_SCALES,
  play: () => clock.resume(),
  pause: () => clock.pause(),
  setTimeScale: (scale) => clock.setTimeScale(scale),
  previewPrecessionDemo: (eccentricity) => geodesicSubsystem.previewPrecessionDemo(eccentricity),
  applyOrbit: (configuration) => {
    const previous = snapshots.latest();
    const previousValues = previous ? {
      massSolar: previous.massSolar,
      schwarzschildRadiusMetres: previous.schwarzschildRadiusMetres,
      radiusRs: previous.radiusRs,
    } : null;
    geodesicSubsystem.apply(configuration);
    photonSubsystem.setMassSolar(geodesicSubsystem.configuration.massSolar);
    clock.setHighSpeedDelta(geodesicSubsystem.maximumSafeAdvanceSeconds());
    const current = refreshPresentationSnapshot(true);
    applyGridVisualization();
    particleRenderer.sync(particles);
    scaleIndicator.recordApplied(previousValues, current);
    if (scaleTransform.mode === RenderScaleMode.AUTO_FIT_PHYSICAL) fitPhysicalScene();
    else ensureCurrentSceneVisible(current);
    if (isTrackableSnapshot(current)) {
      renderer.rebaseParticleFollow(current.renderX, current.renderY, current.renderZ);
    }
  },
  getOrbitConfiguration: () => ({ ...geodesicSubsystem.configuration }),
  resetParticle: () => { geodesicSubsystem.reset(); refreshPresentationSnapshot(true); },
  resetAll: () => {
    clock.reset();
    geodesicSubsystem.reset();
    photonSubsystem.reset();
    refreshPresentationSnapshot(true);
  },
};

const controlPanel = resources.register(new ControlPanel(
  document.querySelector("#control-panel"),
  model,
  grid,
  runtimeControls,
  unitFormatter,
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
    scaleTransform,
    scaleIndicator,
    fitPhysicalScene,
    onScaleChange: () => {
      const snapshot = refreshPresentationSnapshot(true);
      applyGridVisualization();
      ensureCurrentSceneVisible(snapshot);
      if (isTrackableSnapshot(snapshot)) renderer.rebaseParticleFollow(snapshot.renderX, snapshot.renderY, snapshot.renderZ);
    },
    onGridDeformationGain: (gain) => {
      gridInputs.visualDeformationGain = gain;
      applyGridVisualization();
    },
    particleCamera: {
      focus: () => {
        const snapshot = snapshots.latest();
        return isTrackableSnapshot(snapshot) && renderer.focusPoint(snapshot.renderX, snapshot.renderY, snapshot.renderZ);
      },
      setFollow: (enabled) => {
        const snapshot = snapshots.latest();
        if (enabled && !isTrackableSnapshot(snapshot)) return false;
        return renderer.setParticleFollow(enabled, snapshot?.renderX, snapshot?.renderY, snapshot?.renderZ);
      },
    },
    unitFormatter,
  },
));
const appShell = resources.register(new AppShell(
  document.querySelector("#app"),
  { resetCamera: () => renderer.resetCamera() },
));

function isTrackableSnapshot(snapshot) {
  return snapshot?.geodesicStatus === "Active"
    && Number.isFinite(snapshot.renderX) && Number.isFinite(snapshot.renderY) && Number.isFinite(snapshot.renderZ);
}

function applyGridVisualization() {
  const snapshot = snapshots.latest();
  gridInputs.massSolar = snapshot?.massSolar ?? 0;
  gridInputs.renderScale = scaleTransform.isPhysical() ? scaleTransform.scaleFactor : 1;
  grid.update(model, gridInputs);
  visualSettings.updateLegends();
}
ensureCurrentSceneVisible(refreshPresentationSnapshot(true));
applyGridVisualization();
if (scaleTransform.mode === RenderScaleMode.AUTO_FIT_PHYSICAL) fitPhysicalScene();

const renderingSubsystem = {
  order: 100,
  render(renderDelta) {
    const snapshot = snapshots.latest();
    const trackable = isTrackableSnapshot(snapshot);
    visualSettings.setParticleTrackingAvailable(trackable);
    if (trackable) renderer.updateParticleFollow(snapshot.renderX, snapshot.renderY, snapshot.renderZ);
    renderer.render(prepareGridView);
    particleInspector.update(snapshot, snapshots.revision(), particles.revision(), photonSubsystem.revision());
    appShell.update(renderDelta, simulationState);
    scaleIndicator.update(snapshot);
  },
};

const particleSubsystem = {
  order: 60,
  update(delta) {
    geodesicSubsystem.update(delta);
    refreshPresentationSnapshot();
  },
  render() {
    particleRenderer.sync(particles);
    controlPanel.syncRuntime(simulationState, particles.count(), {
      effectiveTimeScale: clock.effectiveTimeScale(),
      trailSamples: geodesicSubsystem.particle.trail.length,
      trailCapacity: geodesicSubsystem.particle.trail.maxLength,
      radialPeriods: geodesicSubsystem.geodesic.diagnostics.radialPeriods,
      periapsisAdvance: geodesicSubsystem.geodesic.diagnostics.periapsisAdvance,
    });
    controlPanel.syncGeodesic(snapshots.latest(), simulationState);
  },
};

const subsystems = new SubsystemManager([particleSubsystem, photonSubsystem, renderingSubsystem]);
subsystems.initialize({ resources, snapshots });

let animationId;
let disposed = false;
const runtimeDiagnostics = { animationFrames: 0, renderedFrames: 0, physicsUpdates: 0, lastPhysicsDelta: 0 };
function prepareGridView(camera) { grid.updateView(camera); }
function updateSimulation(delta, runtimeState) {
  runtimeDiagnostics.physicsUpdates += 1;
  runtimeDiagnostics.lastPhysicsDelta = delta;
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
  getParticleScreenPosition(id) { return particleInspector.getProjectedParticlePosition(id); },
  getPhotonScreenPosition(id) { return particleInspector.getProjectedPhotonPosition(id); },
  getSnapshot() {
    return {
      animationFrames: runtimeDiagnostics.animationFrames,
      renderedFrames: runtimeDiagnostics.renderedFrames,
      simulationDelta: clock.simulationDelta,
      accumulator: clock.accumulator,
      effectiveTimeScale: clock.effectiveTimeScale(),
      droppedSimulationTime: clock.droppedSimulationTime,
      lastUpdateCount: clock.lastUpdateCount,
      physicsUpdates: runtimeDiagnostics.physicsUpdates,
      lastPhysicsDelta: runtimeDiagnostics.lastPhysicsDelta,
      runtime: {
        running: simulationState.running,
        paused: simulationState.paused,
        timeScale: simulationState.timeScale,
        frame: simulationState.frame,
        simulationTime: simulationState.simulationTime,
        renderTime: simulationState.renderTime,
      },
      physics: {
        status: geodesicSubsystem.geodesic.status,
        classification: geodesicSubsystem.geodesic.classification,
        energy: geodesicSubsystem.geodesic.state.energy,
        angularMomentum: geodesicSubsystem.geodesic.state.angularMomentum,
        normalizedTime: geodesicSubsystem.geodesic.state.values[0],
        radius: geodesicSubsystem.geodesic.state.values[1],
        phi: geodesicSubsystem.geodesic.state.values[2],
        radialVelocity: geodesicSubsystem.geodesic.state.values[3],
        normalizedProperTime: geodesicSubsystem.geodesic.state.values[4],
        radialPeriods: geodesicSubsystem.geodesic.diagnostics.radialPeriods,
        radialPeriodAngle: geodesicSubsystem.geodesic.diagnostics.lastRadialPeriodAngle,
        periapsisAdvance: geodesicSubsystem.geodesic.diagnostics.periapsisAdvance,
      },
      particle: {
        revision: particles.revision(),
        x: geodesicSubsystem.particle.position.x,
        y: geodesicSubsystem.particle.position.y,
        z: geodesicSubsystem.particle.position.z,
        trailLength: geodesicSubsystem.particle.trail.length,
        trailCapacity: geodesicSubsystem.particle.trail.maxLength,
      },
      snapshot: {
        revision: snapshots.revision(),
        massSolar: snapshots.latest().massSolar,
        schwarzschildRadiusMetres: snapshots.latest().schwarzschildRadiusMetres,
        normalizedX: snapshots.latest().normalizedX,
        normalizedY: snapshots.latest().normalizedY,
        normalizedZ: snapshots.latest().normalizedZ,
        x: snapshots.latest().renderX,
        y: snapshots.latest().renderY,
        z: snapshots.latest().renderZ,
        properTime: snapshots.latest().properTime,
      },
      particleRenderer: {
        revision: particleRenderer.lastRevision,
        x: particleRenderer.positions[0],
        y: particleRenderer.positions[1],
        z: particleRenderer.positions[2],
        apparentSizeCssPixels: particleRenderer.material.size,
        sizeAttenuation: particleRenderer.material.sizeAttenuation,
      },
      inspector: particleInspector.getDiagnostics(),
      photons: photonSubsystem.getDiagnostics(),
      photonRenderer: {
      markerVisible: photonRenderer.markerObject.visible,
      trailVisible: photonRenderer.trailObject.visible,
      markerSizeCssPixels: photonRenderer.markerMaterial.size,
      sizeAttenuation: photonRenderer.markerMaterial.sizeAttenuation,
      markerX: photonRenderer.markerPositions[0],
      markerY: photonRenderer.markerPositions[1],
      markerZ: photonRenderer.markerPositions[2],
      trailVertices: photonRenderer.trailGeometry.drawRange.count,
    },
      scale: {
        mode: scaleTransform.mode,
        metresPerWorldUnit: scaleTransform.metresPerWorldUnit,
        revision: scaleTransform.revision(),
        horizonRenderRadius: scaleTransform.horizonRenderRadius(),
        fitCount: renderer.fitDiagnostics.count,
      },
      maxFps: frameRateController.maxFps,
      grid: { ...grid.getDiagnostics() },
      camera: {
        x: renderer.camera.position.x, y: renderer.camera.position.y, z: renderer.camera.position.z,
        targetX: renderer.controls.target.x, targetY: renderer.controls.target.y, targetZ: renderer.controls.target.z,
        near: renderer.camera.near, far: renderer.camera.far,
        followingParticle: renderer.followingParticle,
      },
      renderer: { ...renderer.getDiagnostics() },
    };
  },
});
clock.start();
animationId = requestAnimationFrame(animate);
