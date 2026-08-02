export const DEFAULT_LOCALE = "ko";

const KOREAN = Object.freeze({
  shell: Object.freeze({
    eyebrow: "일반상대성이론 연구 콘솔",
    running: "실행 중",
    paused: "일시정지",
    frame: "프레임",
    viewportTools: "뷰포트 도구",
    simulation: "시뮬레이션",
    visualSettings: "시각 설정",
    resetCamera: "카메라 초기화",
    fullscreen: "전체 화면",
    toggleFullscreen: "전체 화면 전환",
    hidePanels: "패널 숨기기",
    showPanels: "패널 표시",
    viewport: "대화형 3차원 중력 시뮬레이션",
    activeModel: "활성 모델",
    modelName: "슈바르츠실트 · 교육용",
    orbitHint: "드래그: 회전",
    panHint: "오른쪽 드래그: 이동",
    zoomHint: "휠: 확대/축소",
    rendererOnline: "렌더러 정상",
    fixedStep: "고정 시뮬레이션 간격",
    camera: "카메라",
    orbitControls: "궤도 조작",
    scope: "시각화 근사 모델 · 수치 상대론 해석기 아님",
    closeOpenPanel: "열린 패널 닫기",
  }),
  simulation: Object.freeze({
    title: "시뮬레이션", close: "닫기", closeLabel: "시뮬레이션 제어 닫기",
    intro: "실행 상태와 슈바르츠실트 시각화 설정을 조정합니다.",
    runtimeControls: "실행 제어", runtime: "실행 제어", play: "재생", pause: "일시정지", running: "실행 중",
    resetParticle: "입자 초기화", resetAll: "전체 초기화", timeScale: "시간 배속",
    physicsInputs: "물리 입력", distanceMode: "거리 계산 모드", mass: "질량 M", wDistance: "W축 거리",
    metricReadout: "계량 정보", schwarzschildRadius: "슈바르츠실트 반지름",
    centralLapse: "중심 시간 지연 계수 α", curvatureProxy: "곡률 근사값", gridVertices: "격자 정점",
    runtimeStatus: "실행 상태", state: "상태", simulationTime: "시뮬레이션 시간", particleCount: "입자 수",
    modelScope: "모델 범위",
    modelScopeDescription: "교육용 슈바르츠실트 계량 시각화이며, 수치 3+1차원 아인슈타인 방정식 해석기가 아닙니다.",
  }),
  visuals: Object.freeze({
    title: "시각 설정", close: "닫기", closeLabel: "시각 설정 닫기",
    intro: "표시 설정은 GPU 재질에만 적용되며 시뮬레이션 상태는 바뀌지 않습니다.",
    particle: "입자", particleSize: "입자 크기", brightness: "밝기", opacity: "투명도",
    trail: "궤적", visible: "표시", ageFade: "시간 경과 감쇠", colorMode: "색상 기준",
    singleColor: "단일 색상", speed: "속도", distance: "거리", age: "시간 경과",
    spacetimeGrid: "시공간 격자", massRendering: "질량체 표현",
    horizonIntensity: "사건지평선 강도", coreEmissive: "중심 발광", reset: "시각 설정 초기화",
    trailDescriptions: Object.freeze({
      single: "시간 경과에 따라 밝기가 감소하는 고대비 호박색 궤적입니다.",
      speed: "현재 입자 속도를 청록색에서 호박색으로 표시합니다.",
      distance: "각 궤적 표본의 중심 거리로 색상을 결정합니다.",
      age: "가장 오래된 표본부터 최신 표본까지 차가운 색에서 따뜻한 색으로 표시합니다.",
    }),
  }),
});

export const UI_LOCALES = Object.freeze({ ko: KOREAN });

export function getUiText(locale = DEFAULT_LOCALE) {
  return UI_LOCALES[locale] ?? KOREAN;
}
