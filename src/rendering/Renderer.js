import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SIMULATION_DOMAIN } from "../core/constants.js";
import { calculatePhysicalSceneFit } from "./scale/PhysicalSceneFit.js";

export class Renderer {
  constructor(container) {
    if (!container) throw new Error("Renderer: viewport element가 필요합니다.");

    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03050b);
    this.scene.fog = new THREE.FogExp2(0x03050b, 0.018);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
    this.camera.position.set(22, 18, 22);
    this.initialCameraPosition = this.camera.position.clone();
    this.fitDirection = new THREE.Vector3();
    this.trackingOffset = new THREE.Vector3();
    this.trackingPosition = new THREE.Vector3();
    this.trackingDelta = new THREE.Vector3();
    this.followingParticle = false;
    this.fitDiagnostics = { count: 0, extent: 0, distance: 0, near: 0.1, far: 500 };

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 8;
    this.controls.maxDistance = SIMULATION_DOMAIN.halfExtent * 1.6;
    this.diagnostics = { drawCalls: 0, lines: 0, points: 0, triangles: 0, geometries: 0, textures: 0 };

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const key = new THREE.PointLight(0x66e6ff, 22, 90);
    key.position.set(4, 8, 6);
    this.scene.add(key);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  add(object) { this.scene.add(object); }

  resetCamera() {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  focusPoint(x, y, z) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
    this.trackingOffset.copy(this.camera.position).sub(this.controls.target);
    if (this.trackingOffset.lengthSq() < Number.EPSILON) this.trackingOffset.copy(this.initialCameraPosition);
    this.controls.target.set(x, y, z);
    this.camera.position.copy(this.controls.target).add(this.trackingOffset);
    this.controls.update();
    return true;
  }

  setParticleFollow(enabled, x, y, z) {
    if (enabled && (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))) return false;
    this.followingParticle = Boolean(enabled);
    if (this.followingParticle) this.trackingPosition.set(x, y, z);
    return this.followingParticle;
  }

  updateParticleFollow(x, y, z) {
    if (!this.followingParticle || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
    this.trackingDelta.set(x, y, z).sub(this.trackingPosition);
    this.controls.target.add(this.trackingDelta);
    this.camera.position.add(this.trackingDelta);
    this.trackingPosition.set(x, y, z);
    return true;
  }

  rebaseParticleFollow(x, y, z) {
    if (!this.followingParticle || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
    this.trackingOffset.copy(this.camera.position).sub(this.controls.target);
    this.controls.target.set(x, y, z);
    this.camera.position.copy(this.controls.target).add(this.trackingOffset);
    this.trackingPosition.set(x, y, z);
    return true;
  }

  fitPhysicalScene(sceneExtent, safetyMargin = 1.25) {
    if (!Number.isFinite(sceneExtent) || sceneExtent <= 0) return false;
    if (!calculatePhysicalSceneFit(this.fitDiagnostics, {
      sceneExtent,
      safetyMargin,
      verticalFovRadians: THREE.MathUtils.degToRad(this.camera.fov),
      aspect: this.camera.aspect,
    })) return false;
    const { extent, distance } = this.fitDiagnostics;
    this.fitDirection.copy(this.camera.position).sub(this.controls.target);
    if (this.fitDirection.lengthSq() < Number.EPSILON) this.fitDirection.set(1, 0.8, 1);
    this.fitDirection.normalize();
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(this.fitDirection).multiplyScalar(distance);
    this.camera.near = this.fitDiagnostics.near;
    this.camera.far = this.fitDiagnostics.far;
    this.controls.minDistance = Math.max(extent * 0.02, this.camera.near * 2);
    this.controls.maxDistance = Math.max(distance * 4, extent * 6);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.fitDiagnostics.count += 1;
    return true;
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render(prepareFrame = null) {
    this.controls.update();
    prepareFrame?.(this.camera);
    this.renderer.render(this.scene, this.camera);
    const render = this.renderer.info.render;
    const memory = this.renderer.info.memory;
    this.diagnostics.drawCalls = render.calls;
    this.diagnostics.lines = render.lines;
    this.diagnostics.points = render.points;
    this.diagnostics.triangles = render.triangles;
    this.diagnostics.geometries = memory.geometries;
    this.diagnostics.textures = memory.textures;
  }

  getDiagnostics() { return this.diagnostics; }

  dispose() {
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
