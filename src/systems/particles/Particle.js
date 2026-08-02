import * as THREE from "three";
import { ParticleState, isParticleState } from "./ParticleState.js";
import { ParticleTrail } from "./ParticleTrail.js";

function setVector(target, value) {
  if (value === undefined || value === null) {
    target.set(0, 0, 0);
  } else if (Array.isArray(value)) {
    target.set(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
  } else {
    target.set(value.x ?? 0, value.y ?? 0, value.z ?? 0);
  }
}

function clearObject(target) {
  const keys = Object.keys(target);
  for (let index = 0; index < keys.length; index += 1) delete target[keys[index]];
}

function copyObject(target, source) {
  clearObject(target);
  if (!source) return;
  const keys = Object.keys(source);
  for (let index = 0; index < keys.length; index += 1) target[keys[index]] = source[keys[index]];
}

export class Particle {
  constructor(maxTrailLength) {
    this.id = null;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.restMass = 0;
    this.properTime = 0;
    this.coordinateTime = 0;
    this.energy = 0;
    this.angularMomentum = new THREE.Vector3();
    this.radius = 1;
    this.color = new THREE.Color(0xffffff);
    this.alive = false;
    this.state = ParticleState.IDLE;
    this.trail = new ParticleTrail(maxTrailLength);
    this.userData = Object.create(null);

    this.initial = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      restMass: 0,
      properTime: 0,
      coordinateTime: 0,
      energy: 0,
      angularMomentum: new THREE.Vector3(),
      radius: 1,
      color: new THREE.Color(0xffffff),
      state: ParticleState.IDLE,
      trailEnabled: true,
      userData: Object.create(null),
    };
  }

  activate(id, options = {}) {
    const state = options.state ?? ParticleState.IDLE;
    if (!isParticleState(state)) throw new RangeError(`Unsupported particle state: ${state}`);

    this.id = id;
    setVector(this.position, options.position);
    setVector(this.velocity, options.velocity);
    setVector(this.acceleration, options.acceleration);
    this.restMass = options.restMass ?? 0;
    this.properTime = options.properTime ?? 0;
    this.coordinateTime = options.coordinateTime ?? 0;
    this.energy = options.energy ?? 0;
    setVector(this.angularMomentum, options.angularMomentum);
    this.radius = options.radius ?? 1;
    this.color.set(options.color ?? 0xffffff);
    this.alive = true;
    this.state = state;
    copyObject(this.userData, options.userData);
    this.trail.clear();
    if (options.trailEnabled === false) this.trail.disable();
    else this.trail.enable();

    this.#captureInitial();
    return this;
  }

  reset() {
    if (!this.alive) return this;

    this.position.copy(this.initial.position);
    this.velocity.copy(this.initial.velocity);
    this.acceleration.copy(this.initial.acceleration);
    this.restMass = this.initial.restMass;
    this.properTime = this.initial.properTime;
    this.coordinateTime = this.initial.coordinateTime;
    this.energy = this.initial.energy;
    this.angularMomentum.copy(this.initial.angularMomentum);
    this.radius = this.initial.radius;
    this.color.copy(this.initial.color);
    this.state = this.initial.state;
    copyObject(this.userData, this.initial.userData);
    this.trail.clear();
    if (this.initial.trailEnabled) this.trail.enable();
    else this.trail.disable();
    return this;
  }

  update(delta) {
    this.velocity.x += this.acceleration.x * delta;
    this.velocity.y += this.acceleration.y * delta;
    this.velocity.z += this.acceleration.z * delta;
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;
    this.coordinateTime += delta;
    this.trail.push(this.position);
  }

  deactivate() {
    this.alive = false;
    this.state = ParticleState.IDLE;
    this.trail.clear();
    clearObject(this.userData);
  }

  #captureInitial() {
    this.initial.position.copy(this.position);
    this.initial.velocity.copy(this.velocity);
    this.initial.acceleration.copy(this.acceleration);
    this.initial.restMass = this.restMass;
    this.initial.properTime = this.properTime;
    this.initial.coordinateTime = this.coordinateTime;
    this.initial.energy = this.energy;
    this.initial.angularMomentum.copy(this.angularMomentum);
    this.initial.radius = this.radius;
    this.initial.color.copy(this.color);
    this.initial.state = this.state;
    this.initial.trailEnabled = this.trail.enabled;
    copyObject(this.initial.userData, this.userData);
  }
}
