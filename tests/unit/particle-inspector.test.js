import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticleManager, ParticleRenderer } from "../../src/systems/index.js";
import { ParticleInspector } from "../../src/ui/ParticleInspector.js";
import { setLocale } from "../../src/ui/i18n.js";
import { UnitFormatter } from "../../src/ui/units/index.js";

function rect(width = 400, height = 300) {
  return { left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON() {} };
}

function pointer(target, type, { x, y, pointerId = 1, pointerType = "mouse", button = 0 } = {}) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    clientX: { value: x }, clientY: { value: y }, pointerId: { value: pointerId },
    pointerType: { value: pointerType }, button: { value: button }, isPrimary: { value: true },
  });
  target.dispatchEvent(event);
}

function snapshot() {
  return Object.freeze({
    geodesicStatus: "Active",
    orbitClassification: "StableCircular",
    radiusRs: 6,
    radiusMetres: 1.2e10,
    localSpeedFraction: 0.3,
    localSpeedMetresPerSecond: 89937737.4,
    properTime: 12,
    coordinateTime: 14,
    energy: 0.95,
    angularMomentum: 1.8,
    radialSpeedFraction: 0,
    tangentialSpeedFraction: 0.3,
    periapsisRadiusRs: 6,
    apocenterRadiusRs: 6,
  });
}

function createHarness() {
  const root = document.createElement("main");
  const viewport = document.createElement("div");
  const canvas = document.createElement("canvas");
  viewport.appendChild(canvas);
  root.appendChild(viewport);
  document.body.appendChild(root);
  root.getBoundingClientRect = () => rect();
  canvas.getBoundingClientRect = () => rect();

  const camera = new THREE.PerspectiveCamera(58, 4 / 3, 0.1, 500);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const particles = new ParticleManager({ maxParticles: 4, maxTrailLength: 16 });
  const particle = particles.create({ id: "p-1" });
  particle.position.set(0, 0, 0);
  particles.touch();
  const particleRenderer = new ParticleRenderer({ maxParticles: 4, maxTrailParticles: 1, maxTrailLength: 16 });
  particleRenderer.sync(particles);
  const focusParticle = vi.fn(() => true);
  const unitFormatter = new UnitFormatter({ locale: () => "en" });
  const renderer = { camera, renderer: { domElement: canvas } };
  const inspector = new ParticleInspector(root, {
    renderer, particleRenderer, particles, unitFormatter, snapshotParticleId: "p-1", focusParticle,
  });
  return { root, canvas, camera, particles, particle, particleRenderer, inspector, focusParticle };
}

let harness;

beforeEach(() => {
  document.body.innerHTML = "";
  globalThis.localStorage?.clear();
  setLocale("en");
  harness = createHarness();
});

afterEach(() => {
  harness?.inspector.dispose();
  harness?.particleRenderer.dispose();
  harness?.particles.dispose();
});

describe("ParticleInspector", () => {
  it("selects a rendered particle without mutating physical state", () => {
    const { inspector, canvas, particle, particles } = harness;
    const stateBefore = {
      x: particle.position.x, y: particle.position.y, z: particle.position.z,
      energy: particle.energy, properTime: particle.properTime, coordinateTime: particle.coordinateTime,
      revision: particles.revision(),
    };
    const point = inspector.getProjectedParticlePosition("p-1");
    expect(point).toMatchObject({ x: 200, y: 150 });
    pointer(canvas, "pointerdown", point);
    pointer(canvas, "pointerup", point);
    inspector.update(snapshot(), 1, particles.revision());

    expect(inspector.getDiagnostics().selectedId).toBe("p-1");
    expect(inspector.getDiagnostics().mode).toBe("anchored");
    expect(harness.root.querySelector(".particle-inspector").hidden).toBe(false);
    expect(harness.root.querySelector('[data-field="radius"]').textContent).toContain("6 rₛ");
    expect({
      x: particle.position.x, y: particle.position.y, z: particle.position.z,
      energy: particle.energy, properTime: particle.properTime, coordinateTime: particle.coordinateTime,
      revision: particles.revision(),
    }).toEqual(stateBefore);
  });

  it("ignores camera drags, persists selection offscreen, and focuses from the edge indicator", () => {
    const { inspector, canvas, particles, particleRenderer, focusParticle } = harness;
    const point = inspector.getProjectedParticlePosition("p-1");
    pointer(canvas, "pointerdown", point);
    pointer(canvas, "pointerup", point);
    inspector.update(snapshot(), 1, particles.revision());

    pointer(canvas, "pointerdown", point);
    pointer(canvas, "pointerup", { x: point.x + 40, y: point.y + 25 });
    expect(inspector.getDiagnostics().selectedId).toBe("p-1");

    particleRenderer.positions[0] = 100;
    inspector.update(snapshot(), 2, particles.revision());
    expect(inspector.getDiagnostics()).toMatchObject({ selectedId: "p-1", mode: "edge" });
    const edge = harness.root.querySelector(".particle-edge-indicator");
    expect(edge.hidden).toBe(false);
    edge.click();
    expect(focusParticle).toHaveBeenCalledOnce();
    expect(focusParticle.mock.calls[0][0]).toBe(100);
  });

  it("keeps an in-front far-plane selection anchored by its screen projection", () => {
    const { inspector, particles, particleRenderer } = harness;
    inspector.select("p-1");
    particleRenderer.positions[0] = 0;
    particleRenderer.positions[1] = 0;
    particleRenderer.positions[2] = -1000;
    inspector.update(snapshot(), 1, particles.revision());
    expect(inspector.getDiagnostics()).toMatchObject({ selectedId: "p-1", mode: "anchored" });
    expect(inspector.getProjectedParticlePosition("p-1")).not.toBeNull();
  });

  it("handles behind-camera particles explicitly and relocalizes the existing card", () => {
    const { inspector, particles, particleRenderer, root } = harness;
    inspector.select("p-1");
    inspector.update(snapshot(), 1, particles.revision());
    expect(root.querySelector(".particle-inspector-kicker").textContent).toBe("Particle Inspector");

    setLocale("ko");
    expect(root.querySelector(".particle-inspector-kicker").textContent).toBe("입자 검사기");

    particleRenderer.positions[0] = 0;
    particleRenderer.positions[1] = 0;
    particleRenderer.positions[2] = 20;
    inspector.update(snapshot(), 2, particles.revision());
    expect(inspector.getDiagnostics()).toMatchObject({ selectedId: "p-1", mode: "behind" });
    expect(inspector.getProjectedParticlePosition("p-1")).toBeNull();
    expect(root.querySelector('[data-field="edgeStatus"]').textContent).toBe("카메라 뒤쪽");
  });
});
