import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SIMULATION_DOMAIN } from "../core/constants.js";

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
