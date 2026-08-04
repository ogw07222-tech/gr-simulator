import * as THREE from "three";

const HORIZON_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const HORIZON_FRAGMENT_SHADER = `
  uniform float uOpacity;
  uniform float uRimIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.2);
    vec3 green = vec3(0.12, 1.0, 0.52) * (0.45 + rim * uRimIntensity);
    gl_FragColor = vec4(green, uOpacity * (0.12 + rim * 0.58));
  }
`;

export class MassObject {
  constructor() {
    this.group = new THREE.Group();
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 40, 40),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    this.horizon = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.ShaderMaterial({
        uniforms: {
          uOpacity: { value: 0.42 },
          uRimIntensity: { value: 1 },
        },
        vertexShader: HORIZON_VERTEX_SHADER,
        fragmentShader: HORIZON_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.group.add(this.core, this.horizon);
  }

  update(model, mass) { this.updateSchwarzschildRadius(model.schwarzschildRadius(mass)); }

  updateSchwarzschildRadius(rs) {
    const visualRadius = Math.max(1.05, Math.sqrt(rs) * 1.45);
    this.horizon.scale.setScalar(visualRadius);
  }

  setAppearance({ horizonOpacity, emissiveIntensity }) {
    this.horizon.material.uniforms.uOpacity.value = horizonOpacity;
    this.horizon.material.uniforms.uRimIntensity.value = emissiveIntensity;
  }

  dispose() {
    for (const child of this.group.children) {
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }
}
