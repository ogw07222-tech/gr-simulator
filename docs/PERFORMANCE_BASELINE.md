# Performance Baseline

This document defines repeatable measurements. Record browser version, operating system, hardware, viewport, device-pixel ratio, commit SHA, simulation mode, mass, W distance, grid parameters, trail capacity, and sampling duration with every result.

## v0.6.1 structural comparison

| Metric | Before v0.6.1 | v0.6.1 | Interpretation |
| --- | ---: | ---: | --- |
| Grid world-space width | 24 | 240 | 10× observable domain |
| Nominal near spacing | 2 | 3 | 1.5× spacing, with sparse far field |
| Grid line vertices | 12,168 | 69,828 | bounded below 70,000 |
| Grid topology vertices | 2,197 object vectors | 12,167 typed entries | raw/display/topology data are reusable typed buffers |
| Grid GPU position + color | ~0.28 MiB | ~1.60 MiB | larger domain with one grid draw call |
| Total grid typed storage | object-backed, not directly comparable | ~2.28 MiB | includes raw values, topology, indices, positions, and colors |
| Trail samples per particle | 256 | 1,024 desktop / 512 mobile | explicit bounded retention |
| Total trail fixed storage at 1,000 particles | ~14.60 MiB | ~58.55 MiB desktop / ~29.25 MiB mobile | allocated at initialization or explicit capacity change only |

The increased fixed memory is an intentional visibility correction and remains bounded. Update, rendering, trail push, and color mapping reuse buffers. Re-run browser frame measurements on representative GPU hardware; geometry counts alone are not an FPS claim.

Production build observed on 2026-08-04 for this branch: HTML 1.80 kB raw / 0.69 kB gzip, CSS 11.55 kB / 3.37 kB, and JavaScript 554.63 kB / 139.66 kB. The earlier recorded JavaScript baseline was approximately 506 kB / 127 kB. The increase includes the bilingual dictionary split, legends, adaptive-grid logic, and correction tests do not ship in the bundle. Vite's existing 500 kB chunk warning remains a known optimization item; this correction does not add code splitting.

## Reference scenario

- Production build served locally with `npm run preview`.
- Desktop viewport: 1920 × 1080 at device-pixel ratio 1.
- Default state: GR + W, mass 120, W distance 1.5, adaptive grid width 240, near extent 12, nominal spacing 3, far-spacing ratio 1.5.
- Camera remains stationary after controls settle.
- Warm up for 10 seconds, then measure for at least 30 seconds.
- Repeat three times and report median plus range.

## Bundle size

Run `npm run build` and record Vite's raw and gzip sizes for HTML, CSS, and JavaScript. Track the largest JavaScript chunk and total transferred bytes. Do not compare development-server output with production builds.

Current observed baseline on 2026-08-03: the JavaScript bundle is approximately 506 kB raw and 127 kB gzip. Treat this as an observation, not a budget, until CI captures it consistently.

## Initial load

Use Chrome DevTools Performance and Network panels with cache disabled. Record navigation start to DOMContentLoaded, load event, first canvas frame, and transferred bytes. Use a local production server to remove public-network variance.

## Average FPS and frame time

Capture a 30-second Chrome Performance trace after warm-up. Record average FPS and frame-time median, p95, and maximum. Report the count of frames over 16.7 ms and 33.3 ms. Keep the tab visible and avoid background applications during capture.

The v0.3 runtime clamps frame gaps to 100 ms and caps fixed simulation work at 480 steps per rendered frame. Record dropped-backlog events when runtime diagnostics expose them in a future profiling change; do not infer simulation throughput from FPS alone.

## Grid update time

Use DevTools User Timing around `VolumetricGrid.update` in a temporary profiling branch or invoke the method from a benchmark harness. Measure default state, mass change, W change, and mode switch separately. Do not commit instrumentation to production without review. Report median, p95, vertex count, and update count.

## Draw calls

Inspect `renderer.info.render.calls`, triangles, points, and lines after a settled frame using DevTools or temporary diagnostics. Record the values for the reference scenario and after every rendering architecture change.

For particles, record active count, fixed updates per rendered frame, trail length, ParticleManager update median/p95, ParticleRenderer sync median/p95, points drawn, and draw-call delta. Measure 0, 100, 500, and 1,000 active particles. The v0.4 target is 1,000 particles at 60 FPS on reference desktop hardware without update-loop allocations.

## Memory and garbage collection

Use Chrome Performance with Memory enabled and take heap snapshots before warm-up, after the 30-second sample, and after teardown/navigation. Record JS heap range, allocation rate, GC event count and duration, detached DOM nodes, and retained Three.js resources. A rising post-GC floor or retained resources after disposal requires investigation.

## Reporting template

```text
Commit / browser / OS / hardware:
Scenario and viewport:
Bundle raw / gzip:
Initial load / first canvas:
FPS average:
Frame time median / p95 / max:
Grid update median / p95:
Draw calls / triangles / lines:
Heap start / peak / post-GC:
GC count / total duration:
Notes and trace location:
```
