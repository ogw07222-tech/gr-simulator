export const VERSION = "0.7.10";

// 시각화용 무차원 단위계. SI 단위 변환은 이후 버전에서 별도 계층으로 추가한다.
export const PHYSICS_DEFAULTS = Object.freeze({
  G: 1,
  c: 10,
  softening: 0.45,
});

export const SIMULATION_DOMAIN = Object.freeze({
  maximumMass: 300,
  maximumOrbitRadiusInSchwarzschildRadii: 10,
  safetyMargin: 1.25,
  halfExtent: 75,
  width: 150,
  gridSpacing: 5,
});

export const SIMULATION_DEFAULTS = Object.freeze({
  mode: "GR_W",
  w: 0,
  gridSize: SIMULATION_DOMAIN.width,
  gridSpacing: SIMULATION_DOMAIN.gridSpacing,
  warpScale: 12,
  maxDisplacement: 2.8,
});

export const TRAIL_CAPACITY = Object.freeze({
  desktop: 16384,
  mobile: 16384,
  desktopOptions: Object.freeze([4096, 16384, 65536]),
  mobileOptions: Object.freeze([4096, 16384, 65536]),
});
