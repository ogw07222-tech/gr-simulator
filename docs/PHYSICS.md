# v0.1 Physics Model

## Scope

The current model is an educational visualization based on selected Schwarzschild quantities and a weak-field grid deformation. It is not a full numerical solution of the Einstein field equations.

## Schwarzschild radius

`r_s = 2GM/c²`

The implementation clamps negative mass to zero.

## Lapse / proper-time factor

For a stationary observer, the displayed lapse is:

`α = sqrt(1 - r_s/r)`

The value is clamped to zero for `r <= r_s`.

## W-axis model

GR + W mode defines an educational effective distance:

`R_eff = sqrt(x² + y² + z² + w² + ε²)`

This is not a complete five-dimensional relativistic metric. It compares how an additional coordinate changes the apparent effect on an observed 3D slice.

## Grid displacement

Grid points move toward the mass using the visualization approximation:

`displacement = scale * r_s / R_eff²`

Softening and maximum displacement prevent divergence and visual topology collapse. This displacement is a rendering proxy, not a physical observable.
