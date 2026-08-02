const STORAGE_KEY = "gr4d.locale";
const DEFAULT_LOCALE = "ko";
const SUPPORTED_LOCALES = Object.freeze(["ko", "en"]);

const messages = Object.freeze({
  ko: Object.freeze({
    "app.title": "GR-4D Simulator v0.6.0",
    "app.description": "브라우저 기반 일반상대성이론 시뮬레이션 및 과학 시각화 실험실",
    "app.eyebrow": "일반상대성이론 연구 콘솔",
    "language.label": "언어 선택",
    "language.ko": "한국어",
    "language.en": "English",
    "status.running": "실행 중",
    "status.paused": "일시정지",
    "status.frame": "프레임",
    "status.rendererOnline": "렌더러 정상",
    "status.fixedStep": "고정 시뮬레이션 간격",
    "status.camera": "카메라",
    "status.cameraControls": "궤도 조작",
    "status.scope": "시각화 근사 모델 · 수치 상대론 해석기 아님",
    "panels.simulation": "시뮬레이션",
    "panels.visualSettings": "시각 설정",
    "panels.visualsShort": "시각 설정",
    "panels.hide": "패널 숨기기",
    "panels.show": "패널 표시",
    "panels.closeSimulation": "시뮬레이션 제어 닫기",
    "panels.closeVisuals": "시각 설정 닫기",
    "panels.close": "닫기",
    "controls.runtime": "실행 제어",
    "controls.runtimeIntro": "실행 상태와 슈바르츠실트 시각화 설정을 조정합니다.",
    "controls.play": "재생",
    "controls.pause": "일시정지",
    "controls.resetParticle": "입자 초기화",
    "controls.resetAll": "전체 초기화",
    "controls.timeScale": "시간 배속",
    "controls.physicsInputs": "물리 입력",
    "controls.distanceMode": "거리 계산 모드",
    "controls.mass": "질량 M",
    "controls.wDistance": "W축 거리",
    "metrics.title": "계량 정보",
    "metrics.schwarzschildRadius": "슈바르츠실트 반지름",
    "metrics.centralLapse": "중심 시간 지연 계수 α",
    "metrics.curvatureProxy": "곡률 근사값",
    "metrics.gridVertices": "격자 정점",
    "runtime.title": "실행 상태",
    "runtime.state": "상태",
    "runtime.simulationTime": "시뮬레이션 시간",
    "runtime.timeScale": "시간 배속",
    "runtime.particleCount": "입자 수",
    "model.scope": "모델 범위",
    "model.scopeDescription": "교육용 슈바르츠실트 계량 시각화이며, 수치 3+1차원 아인슈타인 방정식 해석기가 아닙니다.",
    "model.active": "활성 모델",
    "model.name": "슈바르츠실트 · 교육용",
    "visual.intro": "표시 설정은 GPU 재질에만 적용되며 시뮬레이션 상태는 바뀌지 않습니다.",
    "visual.particle": "입자",
    "visual.particleSize": "입자 크기",
    "visual.brightness": "밝기",
    "visual.opacity": "투명도",
    "visual.trail": "궤적",
    "visual.visible": "표시",
    "visual.ageFade": "시간 경과 감쇠",
    "visual.colorMode": "색상 기준",
    "visual.singleColor": "단일 색상",
    "visual.speed": "속도",
    "visual.distance": "거리",
    "visual.age": "시간 경과",
    "visual.spacetimeGrid": "시공간 격자",
    "visual.massRendering": "질량체 표현",
    "visual.horizonIntensity": "사건지평선 강도",
    "visual.coreEmissive": "중심 발광",
    "visual.reset": "시각 설정 초기화",
    "visual.trail.single": "시간 경과에 따라 밝기가 감소하는 고대비 호박색 궤적입니다.",
    "visual.trail.speed": "현재 입자 속도를 청록색에서 호박색으로 표시합니다.",
    "visual.trail.distance": "각 궤적 표본의 중심 거리로 색상을 결정합니다.",
    "visual.trail.age": "가장 오래된 표본부터 최신 표본까지 차가운 색에서 따뜻한 색으로 표시합니다.",
    "camera.reset": "카메라 초기화",
    "camera.fullscreen": "전체 화면",
    "camera.toggleFullscreen": "전체 화면 전환",
    "camera.viewportTools": "뷰포트 도구",
    "camera.viewport": "대화형 3차원 중력 시뮬레이션",
    "camera.orbitHint": "드래그: 회전",
    "camera.panHint": "오른쪽 드래그: 이동",
    "camera.zoomHint": "휠: 확대/축소",
    "drawer.close": "열린 패널 닫기",
    "units.multiplier": "{value}배",
  }),
  en: Object.freeze({
    "app.title": "GR-4D Simulator v0.6.0",
    "app.description": "Browser-based General Relativity simulation and scientific visualization laboratory",
    "app.eyebrow": "RELATIVITY RESEARCH CONSOLE",
    "language.label": "Select language",
    "language.ko": "한국어",
    "language.en": "English",
    "status.running": "Running",
    "status.paused": "Paused",
    "status.frame": "FRAME",
    "status.rendererOnline": "Renderer online",
    "status.fixedStep": "Fixed simulation step",
    "status.camera": "Camera",
    "status.cameraControls": "Orbit controls",
    "status.scope": "Visualization proxy · not a numerical relativity solver",
    "panels.simulation": "Simulation",
    "panels.visualSettings": "Visual Settings",
    "panels.visualsShort": "Visuals",
    "panels.hide": "Hide Panels",
    "panels.show": "Show Panels",
    "panels.closeSimulation": "Close simulation controls",
    "panels.closeVisuals": "Close visual settings",
    "panels.close": "Close",
    "controls.runtime": "Runtime",
    "controls.runtimeIntro": "Runtime and Schwarzschild visualization controls.",
    "controls.play": "Play",
    "controls.pause": "Pause",
    "controls.resetParticle": "Reset Particle",
    "controls.resetAll": "Reset All",
    "controls.timeScale": "Time Scale",
    "controls.physicsInputs": "Physics Inputs",
    "controls.distanceMode": "Distance mode",
    "controls.mass": "Mass M",
    "controls.wDistance": "W-axis distance",
    "metrics.title": "Metric Readout",
    "metrics.schwarzschildRadius": "Schwarzschild radius",
    "metrics.centralLapse": "Central lapse α",
    "metrics.curvatureProxy": "Curvature proxy",
    "metrics.gridVertices": "Grid vertices",
    "runtime.title": "Runtime Status",
    "runtime.state": "State",
    "runtime.simulationTime": "Simulation time",
    "runtime.timeScale": "Time scale",
    "runtime.particleCount": "Particle count",
    "model.scope": "Model scope",
    "model.scopeDescription": "Educational Schwarzschild metric visualization; not a numerical 3+1D Einstein solver.",
    "model.active": "ACTIVE MODEL",
    "model.name": "Schwarzschild · Educational",
    "visual.intro": "Presentation controls affect GPU materials only. Simulation state remains unchanged.",
    "visual.particle": "Particle",
    "visual.particleSize": "Particle Size",
    "visual.brightness": "Brightness",
    "visual.opacity": "Opacity",
    "visual.trail": "Trail",
    "visual.visible": "Visible",
    "visual.ageFade": "Age fade",
    "visual.colorMode": "Color mode",
    "visual.singleColor": "Single color",
    "visual.speed": "Speed",
    "visual.distance": "Distance",
    "visual.age": "Age",
    "visual.spacetimeGrid": "Spacetime Grid",
    "visual.massRendering": "Mass Rendering",
    "visual.horizonIntensity": "Horizon intensity",
    "visual.coreEmissive": "Core emissive",
    "visual.reset": "Reset Visuals",
    "visual.trail.single": "High-contrast amber with age-based luminance fade.",
    "visual.trail.speed": "Cyan-to-amber mapping from current particle speed.",
    "visual.trail.distance": "Color mapped deterministically from radial distance.",
    "visual.trail.age": "Cool-to-warm gradient from oldest to newest sample.",
    "camera.reset": "Reset Camera",
    "camera.fullscreen": "Fullscreen",
    "camera.toggleFullscreen": "Toggle fullscreen",
    "camera.viewportTools": "Viewport tools",
    "camera.viewport": "Interactive three-dimensional gravity simulation",
    "camera.orbitHint": "Drag to orbit",
    "camera.panHint": "Right-drag to pan",
    "camera.zoomHint": "Wheel to zoom",
    "drawer.close": "Close open panel",
    "units.multiplier": "{value}x",
  }),
});

const listeners = new Set();

function readStoredLocale() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

let locale = readStoredLocale();

function updateDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.title = t("app.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("app.description"));
}

export function getLocale() { return locale; }

export function setLocale(nextLocale) {
  const normalized = SUPPORTED_LOCALES.includes(nextLocale) ? nextLocale : DEFAULT_LOCALE;
  if (normalized === locale) {
    updateDocument();
    return locale;
  }
  locale = normalized;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, locale); } catch { /* Storage can be unavailable. */ }
  updateDocument();
  listeners.forEach((listener) => listener(locale));
  return locale;
}

export function t(key, replacements = null) {
  let value = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? `[${key}]`;
  if (replacements) {
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
  }
  return value;
}

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export { DEFAULT_LOCALE, STORAGE_KEY, SUPPORTED_LOCALES, messages };

updateDocument();
