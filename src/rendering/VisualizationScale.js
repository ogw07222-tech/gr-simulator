export const GRID_ASINH_SOFTNESS = 0.04;
export const DEFAULT_TRAIL_SPEED_MAX = 2;

export function normalizeAsinh(value, maximum, softness = GRID_ASINH_SOFTNESS) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(maximum) || maximum <= 0) return 0;
  const boundedSoftness = Math.max(Number.EPSILON, Math.min(1, softness));
  const scale = maximum * boundedSoftness;
  return Math.min(1, Math.asinh(value / scale) / Math.asinh(maximum / scale));
}

export function normalizeSpeed(speed, maximum = DEFAULT_TRAIL_SPEED_MAX) {
  if (!Number.isFinite(speed) || speed <= 0) return 0;
  if (!Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.min(1, speed / maximum);
}

export function writeSpeedToWhiteColor(target, offset, normalized, intensity = 1) {
  const value = Math.max(0, Math.min(1, normalized));
  const midpoint = Math.min(1, value * 2);
  const upper = Math.max(0, value * 2 - 1);
  target[offset] = (0.12 + midpoint * 0.43 + upper * 0.45) * intensity;
  target[offset + 1] = (0.24 + midpoint * 0.66 + upper * 0.1) * intensity;
  target[offset + 2] = (0.3 + midpoint * 0.62 + upper * 0.08) * intensity;
}

export function writeGridDeformationColor(target, offset, normalized) {
  const value = Math.max(0, Math.min(1, normalized));
  const midpoint = Math.min(1, value * 2);
  const upper = Math.max(0, value * 2 - 1);
  target[offset] = 0.04 + midpoint * 0.04 + upper * 0.92;
  target[offset + 1] = 0.18 + midpoint * 0.68 - upper * 0.78;
  target[offset + 2] = 0.86 + midpoint * 0.1 - upper * 0.93;
}
