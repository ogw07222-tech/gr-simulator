export const ParticleState = Object.freeze({
  IDLE: "Idle",
  MOVING: "Moving",
  ORBITING: "Orbiting",
  ESCAPING: "Escaping",
  CAPTURED: "Captured",
  ABSORBED: "Absorbed",
  OUT_OF_DOMAIN: "OutOfDomain",
});

const PARTICLE_STATES = new Set(Object.values(ParticleState));

export function isParticleState(state) {
  return PARTICLE_STATES.has(state);
}
