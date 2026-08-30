import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticleManager, ParticleRenderer, PhotonRenderer, PhotonSubsystem } from "../../src/systems/index.js";
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

function createHarness() {
  const root = document.createElement("main");
  const canvas = document.createElement("canvas");
  root.appendChild(canvas);
  document.body.appendChild(root);
  root.getBoundingClientRect = () => rect();
  canvas.getBoundingClientRect = () => rect();
  const camera = new THREE.PerspectiveCamera(58, 4 / 3, 0.1, 500);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const particles = new ParticleManager({ maxParticles: 2, maxTrailLength: 8 });
  const particleRenderer = new ParticleRenderer({ maxParticles: 2, maxTrailParticles: 1, maxTrailLength: 8 });
  const photonRenderer = new PhotonRenderer({ maxTrailLength: 128 });
  const photons = new PhotonSubsystem({ enabled: true, renderer: photonRenderer, maxTrailLength: 128 });
  photonRenderer.sync(photons);
  photonRenderer.markerPositions[0] = 0;
  photonRenderer.markerPositions[1] = 0;
  photonRenderer.markerPositions[2] = 0;
  const unitFormatter = new UnitFormatter({ locale: () => "en" });
  const focusParticle = vi.fn(() => true);
  const inspector = new ParticleInspector(root, {
    renderer: { camera, renderer: { domElement: canvas } },
    particleRenderer, particles, photonRenderer, photons, unitFormatter, focusParticle,
  });
  return { root, canvas, particles, particleRenderer, photonRenderer, photons, inspector, focusParticle };
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
  harness?.photonRenderer.dispose();
  harness?.particleRenderer.dispose();
  harness?.particles.dispose();
});

describe("Photon Inspector through shared ParticleInspector infrastructure", () => {
  it("selects the rendered photon without mutating authoritative photon state", () => {
    const { inspector, canvas, photons, root } = harness;
    const before = Array.from(photons.geodesic.state.values);
    const beforeRevision = photons.revision();
    const point = inspector.getProjectedPhotonPosition("photon-0");
    expect(point).not.toBeNull();
    pointer(canvas, "pointerdown", point);
    pointer(canvas, "pointerup", point);
    inspector.update(null, 0, 0, photons.revision());
    expect(inspector.getDiagnostics()).toMatchObject({ selectedKind: "photon", selectedId: "photon-0", mode: "anchored" });
    expect(root.querySelector(".particle-inspector-kicker").textContent).toBe("Photon Inspector");
    expect(root.querySelector('[data-field="photonImpactParameter"]').textContent).toContain("rₛ");
    expect(root.querySelector('[data-field="properTime"]').closest("dl").hidden).toBe(true);
    expect(Array.from(photons.geodesic.state.values)).toEqual(before);
    expect(photons.revision()).toBe(beforeRevision);
  });

  it("keeps camera drags selection-safe, supports edge Focus, and localizes EN/KO", () => {
    const { inspector, canvas, photons, photonRenderer, focusParticle, root } = harness;
    const point = inspector.getProjectedPhotonPosition("photon-0");
    pointer(canvas, "pointerdown", point);
    pointer(canvas, "pointerup", point);
    inspector.update(null, 0, 0, photons.revision());
    pointer(canvas, "pointerdown", point);
    pointer(canvas, "pointerup", { x: point.x + 40, y: point.y + 30 });
    expect(inspector.getDiagnostics().selectedId).toBe("photon-0");

    photonRenderer.markerPositions[0] = 100;
    inspector.update(null, 0, 0, photons.revision());
    expect(inspector.getDiagnostics().mode).toBe("edge");
    root.querySelector(".particle-edge-indicator").click();
    expect(focusParticle).toHaveBeenCalledOnce();

    photonRenderer.markerPositions[0] = 0;
    setLocale("ko");
    inspector.update(null, 0, 0, photons.revision());
    expect(root.querySelector(".particle-inspector-kicker").textContent).toBe("광자 검사기");
  });

  it("performs no inspector snapshot work after Photons OFF", () => {
    const { inspector, photons } = harness;
    const spy = vi.spyOn(photons, "writeSnapshotAt");
    inspector.selectPhoton("photon-0");
    inspector.update(null, 0, 0, photons.revision());
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    photons.setEnabled(false);
    inspector.update(null, 0, 0, photons.revision());
    inspector.update(null, 0, 0, photons.revision());
    expect(spy).not.toHaveBeenCalled();
    expect(inspector.getDiagnostics().selectedId).toBeNull();
  });
});
