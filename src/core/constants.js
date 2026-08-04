export const VERSION = "0.6.1";

// 시각화용 무차원 단위계. SI 단위 변환은 이후 버전에서 별도 계층으로 추가한다.
export const PHYSICS_DEFAULTS = Object.freeze({
  G: 1,
  c: 10,
  softening: 0.45,
});

export const SIMULATION_DEFAULTS = Object.freeze({
  mode: "GR_W",
  mass: 120,
  w: 1.5,
  gridSize: 240,
  gridDivisions: 8,
  gridNearExtent: 12,
  gridFarSpacingRatio: 1.5,
  warpScale: 12,
  maxDisplacement: 2.8,
});

export const TRAIL_CAPACITY = Object.freeze({
  desktop: 1024,
  mobile: 512,
  desktopOptions: Object.freeze([256, 512, 1024]),
  mobileOptions: Object.freeze([256, 512]),
});
