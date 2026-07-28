# v0.1 Physics Model

## Schwarzschild radius

`r_s = 2GM/c²`

## Lapse / proper-time factor

정지 관측자의 시간 지연 계수는 `α = sqrt(1 - r_s/r)`로 표시한다. `r <= r_s`에서는 0으로 제한한다.

## W-axis model

GR + W 모드의 유효거리는 다음처럼 정의한다.

`R_eff = sqrt(x² + y² + z² + w² + ε²)`

이는 5차원 일반상대론의 완전한 계량이 아니라, 추가 좌표가 관측 3차원 절편의 중력 효과를 어떻게 약화하는지 비교하기 위한 v0.1 모델이다.

## Grid displacement

격자의 각 점을 질량 방향으로 이동시키며 변위 크기는 `scale * r_s / R_eff²`로 둔다. 발산과 위상 붕괴를 막기 위해 softening과 최대 변위를 사용한다.
