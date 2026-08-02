# ROADMAP

로드맵은 기존 v0.1 기능을 유지하면서 v0.6의 확장 가능한 시뮬레이터 기반으로 이동하는 순서를 정의한다. 버전 번호는 목표 범위이며 일정 약속이 아니다.

## v0.2 — Baseline & Safety

- 물리 모델, Store, 브라우저 smoke test 추가
- 성능 기준 시나리오와 회귀 체크리스트 확정
- 현재 동작과 근사 모델 문서화 완료

출구 기준: main 브랜치에서 빌드와 핵심 회귀 검증이 자동 실행된다.

## v0.3 — Runtime Foundation

- `SimulatorApp` 수명주기와 subsystem 계약 도입
- simulation clock과 render clock 분리
- selective state subscription과 dirty update 적용
- 기존 렌더 결과와 UI 동작 유지

출구 기준: 시스템별 start/stop/dispose가 검증되고 불필요한 grid 재계산이 제거된다.

## v0.4 — Physics Engine Boundary

- framework-independent Physics Engine API 도입
- MetricModel, solver, snapshot, unit policy 분리
- 기존 SchwarzschildModel을 호환 어댑터로 이동
- 다중 질량과 geodesic solver를 위한 확장점만 마련

출구 기준: 동일 입력의 v0.1 결과가 허용 오차 내 유지되고 physics가 독립 테스트된다.

## v0.5 — Presentation Architecture

- HUD selector/formatter/view 분리
- Control UI의 command binding과 DOM view 분리
- scene resource registry 및 update phase 명시
- Particle System 코어, pool, budget 인터페이스 준비

출구 기준: HUD/UI/scene/particle 경계가 독립적으로 테스트되고 프레임 예산이 계측된다.

## v0.6 — Extensible Simulator Platform

- 구조 마이그레이션 완료 및 deprecated 호환 계층 정리 계획 수립
- 다중 질량/heatmap/particle 효과를 feature flag 뒤에서 통합할 준비
- 성능·접근성·메모리 누수 기준 통과
- 사용자/개발자 문서와 릴리스 체크리스트 확정

출구 기준: 기존 v0.1 기능을 보존하면서 새 물리 모델과 표현 계층을 플러그인 가능한 경계로 추가할 수 있다.

## 비목표

- 이 로드맵 자체는 완전한 Einstein field equation solver를 약속하지 않는다.
- 물리 정확도 확대와 시각 효과 확대는 각각 별도의 검증 기준을 가진다.
- 측정 없이 대규모 재작성하거나 공개 동작을 한 번에 변경하지 않는다.
