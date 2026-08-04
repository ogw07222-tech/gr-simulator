// Edit English interface copy here. Keep this key structure identical to ko.js.
export const en = Object.freeze({
  app: { title: "GR-4D Simulator v0.6.2", description: "Browser-based General Relativity simulation and scientific visualization laboratory", eyebrow: "RELATIVITY RESEARCH CONSOLE" },
  language: { label: "Select language", ko: "한국어", en: "English" },
  status: {
    running: "Running", paused: "Paused", frame: "FRAME", rendererOnline: "Renderer online",
    fixedStep: "Fixed simulation step", camera: "Camera", cameraControls: "Orbit controls",
    scope: "Visualization proxy · not a numerical relativity solver",
  },
  panels: {
    simulation: "Simulation", visualSettings: "Visual Settings", visualsShort: "Visuals",
    hide: "Hide Panels", show: "Show Panels", closeSimulation: "Close simulation controls",
    closeVisuals: "Close visual settings", close: "Close",
  },
  controls: {
    runtime: "Runtime", runtimeIntro: "Runtime and Schwarzschild visualization controls.",
    play: "Play", pause: "Pause", resetParticle: "Reset Particle", resetAll: "Reset All",
    timeScale: "Time Scale", physicsInputs: "Physics Inputs", distanceMode: "Distance mode",
    mass: "Mass M", wDistance: "W-axis distance",
  },
  metrics: {
    title: "Metric Readout", schwarzschildRadius: "Schwarzschild radius", centralLapse: "Central lapse α",
    curvatureProxy: "Curvature proxy", gridVertices: "Grid vertices",
  },
  runtime: { title: "Runtime Status", state: "State", simulationTime: "Simulation time", timeScale: "Time scale", particleCount: "Particle count" },
  particle: { outOfDomain: "Outside supported domain" },
  model: {
    scope: "Model scope", scopeDescription: "Educational Schwarzschild metric visualization; not a numerical 3+1D Einstein solver.",
    active: "ACTIVE MODEL", name: "Schwarzschild · Educational",
  },
  visual: {
    intro: "Presentation controls affect GPU materials only. Simulation state remains unchanged.",
    performance: "Render Performance", maximumFps: "Maximum rendering FPS", unlimited: "Unlimited",
    fpsNote: "Rendering cadence only; the fixed 1/240 s simulation step is unchanged.",
    particle: "Particle", particleSize: "Particle Size", brightness: "Brightness", opacity: "Opacity",
    trail: "Trail", visible: "Visible", ageFade: "Age fade", speed: "Speed",
    trailCapacity: "Trail capacity", trailCapacitySamples: "{value} samples",
    trailCapacityNote: "Fixed preparatory capacity; resizing occurs only when this setting changes.",
    trailSpeedDescription: "Current speed in simulation world units per second; brighter values approach white.",
    spacetimeGrid: "Spacetime Grid", massRendering: "Mass Rendering", horizonIntensity: "Horizon intensity",
    coreEmissive: "Horizon rim intensity", reset: "Reset Visuals",
  },
  legend: {
    speedTitle: "Current particle speed", speedUnit: "simulation units / s",
    gridTitle: "Grid deformation proxy", gridUnit: "model-space display proxy",
    gridScale: "Blue-to-red color and geometry use asinh display scaling for this educational deformation proxy; raw values are unchanged.",
    minimum: "Min", midpoint: "Mid", maximum: "Max",
  },
  camera: {
    reset: "Reset Camera", fullscreen: "Fullscreen", toggleFullscreen: "Toggle fullscreen",
    viewportTools: "Viewport tools", viewport: "Interactive three-dimensional gravity simulation",
    orbitHint: "Drag to orbit", panHint: "Right-drag to pan", zoomHint: "Wheel to zoom",
  },
  drawer: { close: "Close open panel" },
  units: { multiplier: "{value}x" },
});
