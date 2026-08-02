# GR-4D Simulator

Three.js로 Schwarzschild 질량 주변의 공간 절편을 시각화하고, 관측 3차원 거리와 W축을 포함한 유효거리를 비교하는 웹 기반 교육용 시뮬레이터입니다.

> 이 프로젝트는 완전한 Einstein field equation 수치해석기가 아닙니다. 현재 모델은 Schwarzschild 계량에서 얻은 물리량과 약한 장 시각화 근사를 사용합니다.

## 현재 기능 (v0.1)

- Three.js 기반 3차원 체적 격자
- 단일 Schwarzschild 질량과 사건지평선 표현
- Schwarzschild 반지름, lapse, 곡률 proxy 표시
- GR 3D / GR + W 유효거리 비교
- 질량과 W축 거리 실시간 조절
- 물리, 장면, 상태, UI 모듈 분리
- OrbitControls 기반 카메라 조작과 반응형 컨트롤 패널

## 빠른 시작

요구 사항: Node.js 20 이상, npm

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm run build
npm run preview
```

## 조작법

- 드래그: 카메라 회전
- 우클릭 드래그: 카메라 이동
- 휠: 확대/축소
- `GR 3D` / `GR + W`: 거리 모델 전환
- `질량 M`, `W축 거리`: 모델 입력값 변경

## 프로젝트 구조

```text
.
├─ docs/
│  ├─ ARCHITECTURE.md  # 현재 분석과 v0.6 목표 구조
│  └─ PHYSICS.md       # v0.1 물리 모델 정의
├─ src/
│  ├─ core/            # 상수와 observable store
│  ├─ physics/         # 순수 물리 모델
│  ├─ scene/           # Three.js 렌더러와 시각 객체
│  ├─ styles/          # 전역 UI 스타일
│  ├─ ui/              # DOM 컨트롤 패널
│  └─ main.js          # 의존성 조립과 앱 수명주기
├─ TODO.md             # 우선순위가 있는 작업 백로그
└─ ROADMAP.md          # v0.2~v0.6 단계별 계획
```

현재 런타임 흐름은 `ControlPanel → Store → main.js → VolumetricGrid`이며, 렌더 루프는 `MassObject → Renderer`를 매 프레임 갱신합니다. 상세한 진단, 개선 원칙, Physics Engine/HUD/UI/Particle System 설계는 [아키텍처 문서](docs/ARCHITECTURE.md)를 참고하세요.

## 개발 원칙

- 기존 기능과 공개 동작을 보존한 채 작은 단계로 리팩터링합니다.
- 물리 계산은 렌더링 프레임워크에 의존하지 않도록 유지합니다.
- 프레임 핫패스에서는 임시 객체와 불필요한 DOM 갱신을 피합니다.
- 새 경계에는 단위 테스트와 성능 기준을 먼저 정의합니다.
- 물리적 사실, 교육용 근사, 시각적 효과를 문서와 코드에서 구분합니다.

## 계획

- [TODO.md](TODO.md): 실행 가능한 작업, 완료 조건, 우선순위
- [ROADMAP.md](ROADMAP.md): v0.2부터 v0.6까지의 전달 순서
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 목표 모듈 경계와 데이터 흐름

## 라이선스

[MIT License](LICENSE)
