# Architecture Foundation for v0.6

## 1. 현재 구조 분석

### 런타임 구성

```text
index.html
  └─ main.js (composition root / animation lifecycle)
      ├─ core/constants.js
      ├─ core/store.js
      ├─ physics/schwarzschild.js
      ├─ scene/Renderer.js
      ├─ scene/VolumetricGrid.js
      ├─ scene/MassObject.js
      └─ ui/ControlPanel.js
```

- `main.js`가 인스턴스 생성, 상태 연결, animation loop, dispose를 모두 담당한다.
- `Store`는 전체 state를 복제해 전달하는 단순 observable이다.
- `SchwarzschildModel`은 Three.js나 DOM에 의존하지 않는 좋은 출발점이다.
- `VolumetricGrid`는 topology, 물리 샘플링, 변형, 색상 계산, GPU buffer update를 함께 수행한다.
- `ControlPanel`은 DOM 생성, event binding, metric 계산, state rendering을 함께 수행한다.
- `Renderer`와 scene object는 명시적 dispose를 제공한다.

### 유지할 강점

- ES module과 클래스 이름 규칙이 단순하고 일관적이다.
- physics/core/scene/ui의 1차 경계가 이미 존재한다.
- BufferGeometry를 재사용하고 requestAnimationFrame을 쓰는 기본 방향이 적절하다.
- 근사 모델의 물리적 한계가 README와 PHYSICS 문서에 명시되어 있다.

### 개선 기회

1. `main.js`의 책임을 application lifecycle과 clock으로 분리한다.
2. Store 전체 복제/전체 broadcast 대신 selector 기반 구독을 추가한다.
3. grid update의 정적 topology, CPU deformation, GPU upload를 분리한다.
4. grid 핫패스의 Vector3/Color/Array 임시 할당을 typed buffer와 재사용 scratch 값으로 대체한다.
5. UI 입력과 HUD 출력을 분리해 DOM 갱신 빈도를 제어한다.
6. 물리 관측량, 교육용 proxy, 시각 변형의 타입과 명명을 분리한다.

## 2. 목표 구조

아래는 단계적 이동의 목적지이며 디렉터리를 한 번에 재작성하지 않는다.

```text
src/
├─ app/              # SimulatorApp, composition, lifecycle
├─ core/             # clock, events, state, shared contracts
├─ physics/          # models, solvers, units, immutable snapshots
├─ presentation/
│  ├─ scene/         # Three.js adapters and resource ownership
│  ├─ hud/           # read-only metrics projection
│  ├─ ui/            # user commands and accessible controls
│  └─ particles/     # emit/update/render pipeline
└─ main.js           # bootstrap only
```

의존 방향은 `presentation → application contracts → physics/core`로 제한한다. physics는 presentation을 import하지 않는다. 기존 경로는 테스트가 확보된 뒤 호환 re-export 또는 adapter를 거쳐 이동한다.

## 3. 공통 실행 모델

```text
User input → Command → Store
                        ├─ Physics step (fixed timestep) → Snapshot
                        ├─ HUD selectors (throttled) → DOM
                        └─ Render frame → Scene + Particles → GPU
```

- Simulation: 고정 timestep과 누적기(accumulator)를 사용해 프레임률과 결과를 분리한다.
- Render: 최신 immutable snapshot을 보간해 표시한다.
- UI/HUD: state selector 결과가 바뀔 때만 갱신한다.
- 모든 subsystem은 `start()`, `stop()`, `dispose()`의 멱등성을 보장한다.

## 4. Physics Engine 설계

### 책임

- 단위와 입력 검증
- metric/field 모델 평가
- simulation step과 immutable snapshot 생성
- presentation과 무관한 관측량 제공

### 제안 계약

```js
MetricModel.evaluate(position, parameters, outSample)
PhysicsEngine.configure(config)
PhysicsEngine.step(deltaSeconds, commands)
PhysicsEngine.getSnapshot()
PhysicsEngine.dispose()
```

`outSample`과 내부 typed array를 재사용해 대규모 grid 샘플링의 할당을 피한다. snapshot은 presentation이 변경할 수 없으며 `revision`, `simulationTime`, `bodies`, `fields`, `metrics`를 가진다. 기존 `SchwarzschildModel`은 첫 MetricModel adapter가 되어 수치 결과를 보존한다.

### 계층

- `units`: 무차원/SI 변환 정책
- `models`: Schwarzschild 등 순수 수식
- `solvers`: timestep, geodesic 등 상태 진화
- `sampling`: grid/point batch 평가
- `snapshot`: 외부 읽기 모델

### 성능과 정확도

- scalar API와 batch API를 함께 제공한다.
- singularity/softening/clamp 정책을 config에 명시한다.
- proxy 값에는 `Proxy` 접미사 또는 metadata를 사용한다.
- 기준 벡터와 허용 오차 테스트 없이 수식을 교체하지 않는다.

## 5. HUD 설계

HUD는 시뮬레이션 상태를 읽기 전용으로 투영하며 command를 발생시키지 않는다.

```text
Snapshot/Store → selector → formatter → HudView
```

- selector: `selectSchwarzschildRadius`, `selectLapse`, `selectPerformance`
- formatter: 단위, 자릿수, locale을 한곳에서 처리
- view: 이미 생성된 DOM node의 text/class만 변경
- scheduler: 물리 metric은 state revision 시, FPS는 4~10 Hz로 제한

HUD는 Three.js 객체나 PhysicsEngine을 직접 참조하지 않는다. 동일 selector 결과에는 DOM write를 하지 않으며, 숨겨진 HUD는 업데이트를 중지한다.

## 6. UI 설계

UI는 사용자 의도를 command로 변환하고 현재 설정을 반영한다.

```text
DOM event → InputController → validated command → Store/Engine
Store selector → ControlView
```

- `ControlView`: markup과 접근성 상태
- `InputController`: event delegation, listener cleanup, debounce/coalesce
- `commands`: `setMass`, `setMode`, `setWDistance`
- `validation`: 범위, NaN, 단위 정책

슬라이더의 연속 input은 프레임당 한 command로 병합할 수 있다. 현재 ControlPanel의 selector와 DOM id는 호환 계층에서 유지해 사용자 동작을 보존한다.

## 7. Particle System 설계

파티클은 물리의 source of truth가 아니라 snapshot을 소비하는 표현 계층이다.

```text
Emitter → SpawnBuffer → Updater → AttributeBuffers → Renderer
              ↑              Budget/Pool             ↓
              └──────────── lifecycle ───────────────┘
```

### 구성 요소

- `Emitter`: snapshot/event에서 spawn request 생성
- `Pool`: 고정 용량 slot, free list, generation id
- `Updater`: position/velocity/age를 typed array에서 갱신
- `Renderer`: Points/InstancedMesh adapter와 GPU upload
- `Budget`: 최대 활성 수, spawn rate, update frequency, LOD

SoA(Structure of Arrays) typed buffer를 기본으로 하고 프레임 중 객체 생성을 금지한다. 활성 범위만 update/upload하며, off-screen/저사양에서는 spawn rate 또는 update frequency를 낮춘다. emitter와 renderer를 분리해 향후 CPU/GPU simulation 전환이 가능하게 한다.

## 8. Scene 리소스와 업데이트 단계

한 프레임의 순서는 `input flush → zero-or-more physics steps → snapshot publish → scene sync → particle update → render`다. Geometry/Material/Texture 소유자는 생성한 리소스를 dispose하며, 공유 리소스는 registry가 reference count 또는 앱 단위 수명을 관리한다.

`VolumetricGrid` 최적화 우선순위:

1. topology와 base position을 typed array로 고정
2. 임시 Vector3/Color 제거 후 scalar 계산
3. 입력 revision이 바뀔 때만 deformation 수행
4. bounding sphere 재계산 필요성을 측정 후 정책화
5. worker/GPU 이관은 CPU 기준 측정 뒤 결정

## 9. 단계적 마이그레이션 원칙

1. characterization test와 성능 baseline을 먼저 추가한다.
2. 기존 클래스를 adapter 뒤에 두고 새 계약을 한 경계씩 도입한다.
3. 각 단계에서 build, smoke test, 수치 회귀, dispose 검증을 수행한다.
4. 기존 기능은 새 경로가 동등함을 증명한 뒤에만 deprecated 처리한다.
5. 기능 삭제와 대규모 파일 이동은 별도 PR로 분리한다.

## 10. Architecture Decision 후보

- ADR-001: fixed timestep 및 snapshot 보간
- ADR-002: selector 기반 Store 호환 확장
- ADR-003: Physics scalar/batch API와 단위 정책
- ADR-004: Particle SoA pool과 렌더 backend
- ADR-005: scene resource ownership

이 문서는 구현 사양의 출발점이다. 실제 경계와 예산은 P0 baseline 측정 결과로 확정한다.
