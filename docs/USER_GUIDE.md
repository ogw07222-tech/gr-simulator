# GR-4D Simulator 사용자 안내서 / User Guide

v0.7.2는 기존 슈바르츠실트 측지선 물리와 렌더링을 그대로 유지하면서 실험 설정 과정을 명확하게 정리한다. 앱 상단의 **사용 안내 / Guide**에서 핵심 내용을 한국어와 영어로 볼 수 있다.

## 빠른 시작

1. 원형 궤도, 국소 정지 관측자 속도, 보존량 중 하나를 선택한다.
2. 블랙홀 질량과 초기 반지름을 입력한다. 반지름은 `rₛ` 단위이며 지평선 바깥이어야 한다.
3. 선택한 방식에 필요한 값만 입력하고 **초기 조건 적용**을 누른다. 초안은 적용 전까지 활성 시뮬레이션에 영향을 주지 않는다.
4. **재생**을 누르고 적분 상태, 분류, 보존량 드리프트와 4-속도 잔차를 확인한다.

## 재현 가능한 예시

| 실험 | 방식 | 입력 |
| --- | --- | --- |
| 안정 원형 | 원형 | `r = 6 rₛ` |
| 불안정 원형 | 원형 | `r = 2.5 rₛ` |
| 방사 낙하 | 국소 속도 | `r = 4 rₛ`, `βᵣ = -0.8`, `βφ = 0` |
| 속박 비원형 | 보존량 | `r = 6 rₛ`, `ε = 0.965`, `λ = 2`, 안쪽 |
| 바깥 경계 이탈 | 보존량 | `r = 5 rₛ`, `ε = 1.2`, `λ = 0`, 바깥쪽 |

## 수치 적분

런타임은 고정 `1/240 s` 간격으로 진행하고 측지선 솔버는 고전적 RK4를 사용한다. 정규화 솔버 스텝 상한은 `0.02`다. 최대 하위 스텝 수의 기본값은 `128`, 허용 범위는 `1–4096`이다.

## 과학적 범위

현재 모델은 고정된 슈바르츠실트 시공간에서 시간꼴 시험 입자를 적분한다. 회전, 역반응, 복사 반작용, 충돌, 유한 크기 물체 또는 수치 상대론 시공간 진화는 지원하지 않는다. 격자 변형은 교육용 시각화 프록시이며 측지선 솔버의 물리 상태가 아니다.

## English quick reference

### Scale views

Use **Scale and View** in Visual Settings. **Normalized** displays `r_s = 1` world unit. **Physical** converts the horizon, particle, and trail with the configured metres per world unit while leaving the camera untouched. **Auto-fit physical** uses the same conversion and fits the camera once when the mode, physical scale, or applied mass changes. The grid remains a normalized educational proxy rather than an SI spatial lattice.

The scale indicator shows the active convention and equivalent distances. Changing this presentation never changes the active geodesic, time, conserved quantities, classification, or trail history.

Choose a preset, enter only its relevant values, apply atomically, then play and inspect status, classification, invariant drift, and four-velocity residual. See [GLOSSARY.md](./GLOSSARY.md) for terminology.
