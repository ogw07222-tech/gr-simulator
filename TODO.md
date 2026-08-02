# TODO

이 문서는 기능 보존형 리팩터링 백로그다. 이번 기반 작업에서는 아래 항목을 구현하지 않는다.

## P0 — 안전망

- [ ] 현재 GR/GR_W 입력 조합의 물리 모델 회귀 테스트 작성
- [ ] Store 구독·해제·불변 복사 동작 테스트 작성
- [ ] 프로덕션 빌드와 브라우저 smoke test를 CI에 추가
- [ ] FPS, 프레임 시간, JS heap, grid update 시간을 측정하는 기준 시나리오 정의
- [ ] 기존 UI 조작, 카메라, dispose 동작의 수동 회귀 체크리스트 작성

완료 조건: 기존 v0.1 동작을 자동 또는 반복 가능한 수동 절차로 검증할 수 있다.

## P1 — 애플리케이션 경계

- [ ] `main.js` 조립 코드를 `SimulatorApp` 수명주기로 이동
- [ ] fixed timestep simulation과 requestAnimationFrame render clock 분리
- [ ] Store state를 physics, presentation, runtime slice로 분류
- [ ] dirty flag/selective subscription으로 grid와 HUD 갱신 범위 제한
- [ ] 모든 하위 시스템에 일관된 `start/stop/dispose` 계약 적용

완료 조건: 시작·정지·해제가 한 경계에서 관리되고, 입력 변화가 필요한 시스템만 갱신한다.

## P1 — Physics Engine

- [ ] 좌표/벡터 DTO와 단위계 정책 정의
- [ ] MetricModel 인터페이스와 Schwarzschild 어댑터 정의
- [ ] solver 출력 snapshot 계약 정의
- [ ] 교육용 proxy와 물리 관측량 명명 규칙 분리
- [ ] singularity, 음수 질량, 비정상 입력 정책 정의

완료 조건: physics 패키지가 Three.js와 DOM 없이 테스트 가능하고 기존 결과를 허용 오차 내 재현한다.

## P1 — HUD와 UI

- [ ] ControlPanel을 입력 command와 출력 metric view로 분리
- [ ] HUD selector와 숫자 formatter를 순수 함수로 추출
- [ ] event delegation과 listener registry 도입
- [ ] 키보드 접근성, focus 상태, reduced-motion 정책 정의
- [ ] HUD 갱신 빈도를 렌더 FPS와 분리

완료 조건: UI가 Store 전체를 재조회하지 않고 필요한 state projection만 소비한다.

## P2 — Scene와 Particle System

- [ ] VolumetricGrid의 정적 topology와 동적 deformation 단계 분리
- [ ] 프레임 핫패스의 `clone`, `new Array`, `new Color` 제거 계획 검증
- [ ] geometry/material 리소스 소유권 규칙 정의
- [ ] ParticleSystem emitter/updater/renderer 계약과 object pool 설계
- [ ] 파티클 예산, LOD, off-screen 정책과 벤치마크 정의

완료 조건: 프레임당 할당량과 draw call 예산을 측정할 수 있고 리소스 누수가 없다.

## P2 — 개발 경험

- [ ] ESLint/Prettier 도입 여부를 현재 스타일과 함께 결정
- [ ] JSDoc 기반 공개 계약 문서화
- [ ] Architecture Decision Record 템플릿 추가
- [ ] PR 성능 회귀 체크 항목 추가

## 보류

- 다중 질량, geodesic integration, heatmap, 새로운 파티클 효과는 P0/P1 기반이 안정된 뒤 진행한다.
- API 또는 화면 동작을 깨는 변경은 별도 마이그레이션 계획 없이 진행하지 않는다.
