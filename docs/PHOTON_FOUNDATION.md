# Schwarzschild Photon Foundation — v0.8.0

## Scope

v0.8.0 adds test photons that follow true null geodesics in the same fixed analytic Schwarzschild spacetime used by the existing massive-particle simulator. Photons are not implemented as zero-mass approximations of the timelike particle solver. The photon solver has its own null state and uses an affine parameter; there is no advancing photon proper time.

This is a trajectory visualization and diagnostic foundation. It does **not** yet implement per-pixel ray tracing, black-hole image or shadow synthesis, an accretion disk, Einstein-ring image synthesis, Kerr spacetime, or WebGPU/WASM photon acceleration.

## Coordinates and normalization

The photon solver uses the project Schwarzschild convention:

- `r_s = 2GM/c² = 2 M_geo`
- `r̄ = r / r_s`
- `t̄ = c t / r_s`
- `f(r̄) = 1 - 1/r̄`

The equatorial null state is evolved with a dimensionless affine parameter `λ̄`. With conserved energy `E` and angular momentum `L`, the implemented first-order system is:

```text
dt̄/dλ̄ = E / f
dr̄/dλ̄ = u_r
dφ/dλ̄ = L / r̄²
du_r/dλ̄ = L² (1/r̄³ - 3/(2 r̄⁴))
```

The null first integral is:

```text
u_r² = E² - f L²/r̄² .
```

The normalized impact parameter is `b/r_s = L/E`. The solver measures the null-condition residual from `g_{μν} k^μ k^ν` and exposes absolute and relative errors through diagnostics and the Photon Inspector.

## Schwarzschild reference physics

- Event horizon: `r_h = 1.0 r_s`
- Photon sphere: `r_ph = 1.5 r_s`
- Critical impact parameter: `b_crit = (3√3/2) r_s ≈ 2.598076 r_s`

Deterministic trajectory tests verify capture below `b_crit`, scattering above it, strong deflection near it, and the unstable null circular-orbit reference at the photon sphere.

## Deflection measurement

Scattering photons retain the incoming asymptotic coordinate direction derived from the null initial state. On escape, the outgoing direction is derived from the integrated null state and total deflection is measured from the unwrapped spatial heading. Rendering never inserts an analytic bending angle.

The weak-field validation uses `b = 25 r_s` and compares the numerical result with:

```text
α ≈ 4GM/(b c²) = 2 r_s/b .
```

The existing tolerance accounts for the known higher-order Schwarzschild correction and the finite asymptotic boundary; it is not used to alter the rendered trajectory.

## States and termination

Photon trajectory states are `ACTIVE`, `CAPTURED`, and `ESCAPED`, with numerical failure tracked separately. The validated null solver uses a near-horizon capture threshold of `1.0005 r_s`, a bounded escape domain, and RK4 substeps capped by solver configuration. The Light Bending demo preserves its validated maximum affine substep of `0.005` for strong-field accuracy without changing the null equations or relaxing null-error tolerances.

## Performance and rendering

`Photons OFF` is the default and an absolute recurring-work gate. While OFF, photon integration, trajectory updates, trail updates, photon diagnostics, and photon render-buffer synchronization do not run. The massive-particle subsystem continues normally.

Supported bundle counts are `1`, `8`, `32`, and `64`; enabling photons defaults to `1`. Each photon owns an independent instance of the same validated null-geodesic solver and independent bounded trail state. Rendering uses one preallocated `THREE.Points` marker buffer and one bounded line-segment trail buffer sized for up to 64 photons. The marker uses `sizeAttenuation: false`, is approximately eight CSS pixels, and has no physical photon-radius interpretation. Trails are bounded to 128 samples per photon by default.

## Photon Inspector

The existing screen-space Particle Inspector infrastructure is shared with photons. A selected photon shows ID, Schwarzschild null-geodesic model, radius, impact parameter, state, and measured deflection when available. Collapsed details expose affine parameter, conserved `E` and `L`, radial direction, integration state, and null-condition absolute/relative errors. Timelike-only fields such as rest mass, orbit classification, and advancing proper time are not shown for photons.

## Light Bending demo

The collapsed photon setup includes **Light Bending**. It launches eight approximately parallel rays from a finite weak-field starting line with impact parameters

```text
[2.2, 2.45, 2.62, 2.8, 3.2, 4, 5, 6] r_s
```

spanning both sides of `b_crit`. Captured and scattered rays separate because each ray is independently integrated by the Schwarzschild null solver. No trail rotation, analytic graphics offset, screen-space distortion, or fake lensing is applied.
