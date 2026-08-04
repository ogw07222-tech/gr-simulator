// 한국어 UI 문구는 이 파일에서 관리합니다. 키 구조를 en.js와 동일하게 유지하세요.
export const ko = Object.freeze({
  app: { title: "GR-4D Simulator v0.6.2", description: "브라우저 기반 일반상대성이론 시뮬레이션 및 과학 시각화 실험실", eyebrow: "일반상대성이론 연구 콘솔" },
  language: { label: "언어 선택", ko: "한국어", en: "English" },
  status: {
    running: "실행 중", paused: "일시정지", frame: "프레임", rendererOnline: "렌더러 정상",
    fixedStep: "고정 시뮬레이션 간격", camera: "카메라", cameraControls: "궤도 조작",
    scope: "시각화 근사 모델 · 수치 상대론 해석기 아님",
  },
  panels: {
    simulation: "시뮬레이션", visualSettings: "시각 설정", visualsShort: "시각 설정",
    hide: "패널 숨기기", show: "패널 표시", closeSimulation: "시뮬레이션 제어 닫기",
    closeVisuals: "시각 설정 닫기", close: "닫기",
  },
  controls: {
    runtime: "실행 제어", runtimeIntro: "실행 상태와 슈바르츠실트 시각화 설정을 조정합니다.",
    play: "재생", pause: "일시정지", resetParticle: "입자 초기화", resetAll: "전체 초기화",
    timeScale: "시간 배속", physicsInputs: "물리 입력", distanceMode: "거리 계산 모드",
    mass: "질량 M", wDistance: "W축 거리",
  },
  metrics: {
    title: "계량 정보", schwarzschildRadius: "슈바르츠실트 반지름", centralLapse: "중심 시간 지연 계수 α",
    curvatureProxy: "곡률 근사값", gridVertices: "격자 정점",
  },
  runtime: { title: "실행 상태", state: "상태", simulationTime: "시뮬레이션 시간", timeScale: "시간 배속", particleCount: "입자 수" },
  particle: { outOfDomain: "지원 영역 이탈" },
  model: {
    scope: "모델 범위", scopeDescription: "교육용 슈바르츠실트 계량 시각화이며, 수치 3+1차원 아인슈타인 방정식 해석기가 아닙니다.",
    active: "활성 모델", name: "슈바르츠실트 · 교육용",
  },
  visual: {
    intro: "표시 설정은 GPU 재질에만 적용되며 시뮬레이션 상태는 바뀌지 않습니다.",
    performance: "렌더링 성능", maximumFps: "최대 렌더링 FPS", unlimited: "제한 없음",
    fpsNote: "렌더링 간격만 바뀌며 고정 1/240초 시뮬레이션 간격은 유지됩니다.",
    particle: "입자", particleSize: "입자 크기", brightness: "밝기", opacity: "투명도",
    trail: "궤적", visible: "표시", ageFade: "시간 경과 감쇠", speed: "속도",
    trailCapacity: "궤적 용량", trailCapacitySamples: "{value}개 표본",
    trailCapacityNote: "향후 궤도를 위한 고정 준비 용량이며, 이 설정을 바꿀 때만 버퍼를 재할당합니다.",
    trailSpeedDescription: "현재 속도는 시뮬레이션 월드 단위/초이며, 빠를수록 흰색에 가까워집니다.",
    spacetimeGrid: "시공간 격자", massRendering: "질량체 표현", horizonIntensity: "사건지평선 강도",
    coreEmissive: "사건지평선 테두리 강도", reset: "시각 설정 초기화",
  },
  legend: {
    speedTitle: "현재 입자 속도", speedUnit: "시뮬레이션 월드 단위/초",
    gridTitle: "격자 변형 프록시", gridUnit: "모델 공간 표시 프록시",
    gridScale: "교육용 변형 프록시에 파랑-빨강 색상과 asinh 표시 배율을 사용하며 원시값은 바꾸지 않습니다.",
    minimum: "최소", midpoint: "중간", maximum: "최대",
  },
  camera: {
    reset: "카메라 초기화", fullscreen: "전체 화면", toggleFullscreen: "전체 화면 전환",
    viewportTools: "뷰포트 도구", viewport: "대화형 3차원 중력 시뮬레이션",
    orbitHint: "드래그: 회전", panHint: "오른쪽 드래그: 이동", zoomHint: "휠: 확대/축소",
  },
  drawer: { close: "열린 패널 닫기" },
  units: { multiplier: "{value}배" },
});
