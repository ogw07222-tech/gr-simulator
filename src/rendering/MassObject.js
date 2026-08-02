import * as THREE from "three";

export class MassObject {
  constructor() {
    this.group = new THREE.Group();

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 40, 40),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x55dfff,
        emissiveIntensity: 1.8,
        roughness: 0.22,
        metalness: 0.45,
      }),
    );

    this.horizon = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff3b8d,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      }),
    );

    this.group.add(this.core, this.horizon);
  }

  update(model, mass) {
    this.updateSchwarzschildRadius(model.schwarzschildRadius(mass));
  }

  updateSchwarzschildRadius(rs) {
    const visualRadius = Math.max(1.05, Math.sqrt(rs) * 1.45);
    this.horizon.scale.setScalar(visualRadius);
    this.core.rotation.y += 0.004;
  }

  dispose() {
    for (const child of this.group.children) {
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }
}
