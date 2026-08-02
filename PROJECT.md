# GR-4D Simulator

> Browser-based Research Grade General Relativity Simulator

---

# Vision

This project aims to become the most complete browser-based General Relativity simulator.

Goals:

- Research-grade architecture
- Scientific correctness
- High performance
- Expandability
- Clean software engineering
- Long-term maintainability

---

# Development Principles

## Never

- Break existing functionality
- Remove working features
- Ignore tests
- Sacrifice architecture for shortcuts

## Always

- Performance first
- Test before merge
- CI must pass
- Minimize allocations
- Reuse memory
- Preserve API compatibility

---

# Current Progress

## v0.1 Core Architecture ✅

- Architecture
- README
- ROADMAP
- TODO
- CONTRIBUTING
- CHANGELOG
- Documentation

---

## v0.2 Safety Baseline ✅

- Vitest
- Playwright
- ESLint
- GitHub Actions
- Physics Tests
- Store Tests
- Performance Baseline

---

## v0.3 Runtime Engine ✅

- SimulationClock
- SimulationState
- SnapshotManager
- ResourceManager
- SubsystemManager

Features

- Fixed timestep
- Pause
- Resume
- Time Scale
- Snapshot rendering
- Resource ownership

Performance

- No allocations inside animation loop

Tests

- Runtime tests
- Physics tests
- Store tests
- Playwright

---

# Roadmap

## v0.4

Particle Engine

- ParticleManager
- Massive Particles
- Test Particles
- Trail System
- Buffer Rendering
- Selection API

---

## v0.5

Simulation HUD

- FPS
- Simulation Time
- Proper Time
- Coordinate Time
- Mass
- Event Horizon
- Angular Momentum
- Energy
- Velocity

---

## v0.6

Orbit Engine

- Orbit Classification
- Stable Orbit
- Escape Orbit
- Capture
- Trail Analysis

---

## v0.7

Schwarzschild Geodesics

- Timelike Geodesics
- Photon Sphere
- ISCO
- Perihelion Precession
- Conserved Quantities

---

## v0.8

Kerr Metric

- Rotating Black Hole
- Frame Dragging
- Ergosphere
- Kerr ISCO
- Spin Parameter

---

## v0.9

Photon Ray Tracing

- Photon Geodesics
- Gravitational Lensing
- Black Hole Shadow
- Photon Ring
- Accretion Disk

---

## v1.0

Research Edition

- Inspector
- Scientific Visualization
- Data Export
- Simulation Recording
- Metric Viewer
- Tensor Viewer
- Experiment Presets

---

# Future Vision

## GPU Computing

- WebGPU
- Compute Shaders
- Massive Parallel Simulation

---

## Numerical Relativity

- ADM Formalism
- BSSN
- Dynamic Space-time

---

## Einstein Equation Solver

Future long-term goal:

Stress-Energy Tensor

↓

Einstein Field Equations

↓

Metric Solver

↓

Geodesic Solver

↓

Particle Simulation

↓

Photon Simulation

↓

Rendering

---

# Runtime Philosophy

Physics

↓

Snapshot

↓

Renderer

↓

HUD

↓

UI

Renderer must never modify physics.

Physics must never depend on rendering.

Everything is modular.

---

# Performance Targets

60 FPS

1000+ particles

Zero allocations inside update loop

Memory reuse

Buffer reuse

Typed arrays

---

# Repository Workflow

Issue

↓

Branch

↓

Commit

↓

Pull Request

↓

Review

↓

Merge

↓

Done

---

# Branch Naming

feature/gr-vX.X-name

Examples

feature/gr-v0.4-particles

feature/gr-v0.5-hud

feature/gr-v0.6-orbits

---

# Pull Request Rules

Every PR must include

- Architecture summary
- Tests
- Build result
- Performance impact
- Future extension points

---

# Lead Developer Notes

The project is designed as a long-term research platform.

Code quality is more important than development speed.

Every subsystem should be extensible toward

- General Relativity
- Numerical Relativity
- GPU Simulation
- Scientific Research
