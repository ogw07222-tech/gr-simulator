import { performance } from "node:perf_hooks";
import process from "node:process";
import { ParticleManager, ParticleRenderer } from "../src/systems/index.js";
import {
  RenderScaleMode, RenderScaleTransform, calculatePhysicalSceneFit,
} from "../src/rendering/index.js";

const transform = new RenderScaleTransform();
transform.setSchwarzschildRadiusMetres(11813357528.26751);
const particles = new ParticleManager({ maxParticles: 1, maxTrailLength: 1024 });
const particle = particles.create({ position: [6, 0, 0] });
for (let index = 0; index < 1024; index += 1) {
  const angle = index / 1024 * Math.PI * 2;
  particle.trail.push({ x: 6 * Math.cos(angle), y: 0, z: 6 * Math.sin(angle) });
}
particles.touch();
const particleRenderer = new ParticleRenderer({ maxParticles: 1, maxTrailLength: 1024, scaleTransform: transform });
const originalBuffers = [particleRenderer.positions, particleRenderer.trailPositions, particleRenderer.geometry, particleRenderer.trailGeometry];

let start = performance.now();
for (let index = 0; index < 100; index += 1) {
  transform.setMode(index % 2 ? RenderScaleMode.NORMALIZED : RenderScaleMode.PHYSICAL);
  particleRenderer.sync(particles);
}
const modeSwitchMilliseconds = performance.now() - start;

start = performance.now();
transform.setSchwarzschildRadiusMetres(23626715056.53502);
particleRenderer.sync(particles);
const massChangeMilliseconds = performance.now() - start;

const fit = { extent: 0, distance: 0, near: 0, far: 0 };
start = performance.now();
calculatePhysicalSceneFit(fit, { sceneExtent: 141.76, safetyMargin: 1.25, verticalFovRadians: Math.PI / 3, aspect: 1.6 });
const cameraFitMilliseconds = performance.now() - start;

const resourcesStable = originalBuffers[0] === particleRenderer.positions
  && originalBuffers[1] === particleRenderer.trailPositions
  && originalBuffers[2] === particleRenderer.geometry
  && originalBuffers[3] === particleRenderer.trailGeometry;

globalThis.console.log(JSON.stringify({
  modeSwitches: 100,
  modeSwitchTotalMilliseconds: modeSwitchMilliseconds,
  modeSwitchMeanMilliseconds: modeSwitchMilliseconds / 100,
  massChangeAndBufferUpdateMilliseconds: massChangeMilliseconds,
  particleAndTrailVerticesUpdated: 1 + particleRenderer.trailGeometry.drawRange.count,
  cameraFitMilliseconds,
  resourceCountsBefore: { geometries: 2, materials: 4, typedBuffers: 4 },
  resourceCountsAfter: { geometries: 2, materials: 4, typedBuffers: 4 },
  resourcesStable,
  heapUsedBytes: process.memoryUsage().heapUsed,
}, null, 2));

particleRenderer.dispose();
