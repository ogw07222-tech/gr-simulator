# Unit System

The production geodesic engine exposes SI quantities at its boundary and integrates in a dimensionless Schwarzschild system. Constants are defined once in `PhysicalConstants.js`: `c = 299792458 m/s`, `G = 6.67430e-11 m³ kg⁻¹ s⁻²`, and `M☉ = 1.98847e30 kg`.

## Normalized convention

The length scale is the Schwarzschild radius

`r_s = 2GM/c²`.

The time scale is

`t_s = r_s/c = 2GM/c³`.

Internally `c = 1`, `r_s = 1`, `ρ = r/r_s`, and `s = cτ/r_s`. The mass parameter `GM/c²` is therefore `1/2`; formulas copied from an `M = GM/c² = 1` convention require explicit conversion. Normalized specific angular momentum is `λ = ℓ/(c r_s)`. Specific energy `ε = E/(mc²)` is dimensionless.

Public conversion APIs name SI explicitly. Radius conversions use metres, time conversions use seconds, velocity conversions use metres per second, and SI specific angular momentum uses square metres per second. One solar mass gives `r_s = 2953.339382066878 m`, preventing the common factor-of-two error.

## Presentation units

`src/ui/units/UnitFormatter.js` is the sole UI conversion boundary. Automatic mode chooses readable metric or astronomical units by magnitude; SI mode keeps metres, kilograms, seconds, metres per second, and joules; Astronomical mode prefers AU, solar masses, fractions of `c`, and Julian years. The selected policy is stored as `gr4d.displayUnits`.

Formatting never mutates snapshots or solver values. The formatter caches unchanged value/mode/locale combinations and UI consumers update text only at their existing bounded refresh cadence. To add a display unit, extend this formatter and its boundary tests rather than converting values inside a panel.

## Rendering scale boundary

Physics snapshots remain authoritative in normalized Schwarzschild coordinates. Normalized view uses `1 world unit = 1 r_s`. Physical views use the presentation-only conversion

`render coordinate = normalized coordinate × r_s(m) / configured metres per world unit`.

The same factor is applied to the horizon, particle position, and every trail sample. It is never passed into the geodesic equations. The configurable metres-per-world-unit value is a camera/rendering convention, not a change to SI constants or solver normalization.

The supported UI mass range is `1–10¹⁰ M☉`. Normalization makes the solver dynamics mass-independent while SI readouts scale predictably; this range also avoids unusable number-entry magnitudes.
