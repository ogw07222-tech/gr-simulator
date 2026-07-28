# GR-4D Simulator

웹 기반 일반상대성이론(General Relativity) + W축 중력 시뮬레이터.

## v0.1 범위

- Three.js 기반 3차원 체적 격자
- 단일 Schwarzschild 질량
- Schwarzschild 반지름, lapse, 곡률 proxy 표시
- GR 3D / GR + W 유효거리 비교
- 질량과 W축 거리 실시간 조절
- 물리, 장면, 상태, UI 모듈 분리

> 주의: v0.1은 완전한 Einstein field equation 수치해석기가 아닙니다. Schwarzschild 계량에서 얻은 물리량과 약한 장 시각화 근사를 사용합니다.

## 실행

```bash
npm install
npm run dev
```

프로덕션 빌드:

```bash
npm run build
npm run preview
```

## 구조

```text
src/
├─ core/       # 상수와 상태 저장소
├─ physics/    # 계량/물리 모델
├─ scene/      # Three.js 렌더러와 시각 객체
├─ ui/         # 컨트롤 패널
├─ styles/     # 스타일
└─ main.js     # 앱 조립
```

## v0.2 예정

- 다중 질량 데이터 모델
- 질량 위치 이동
- 곡률/퍼텐셜 heatmap
- 물리 단위계 프리셋
- 테스트 추가
