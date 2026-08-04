# Performance Baseline

## v0.6.2 render correction

Measurements use Chromium on the same Windows development host at 1600×1000. The pre-change short stationary sample reported 60 FPS, 225 DOM nodes, one canvas, 69,828 submitted grid line vertices, and one indivisible grid draw call. No short-run decline was reproduced, so this release does not claim a confirmed memory leak.

The approved correction rejects distance-based LOD and render-distance omission. Maximum mass 300 yields `r_s = 6`; an official maximum initial orbital radius of `10 r_s` and safety margin 1.25 produce a half extent of 75. The accepted lower-cost uniform spacing of 5 produces 31 samples per axis, 29,791 unique model vertices, 86,490 line segments, and 172,980 indexed line vertices.

The fixed 64-chunk indexed grid uses approximately 2.69 MiB of CPU typed storage and 1.34 MiB of GPU vertex/index storage. Shared position and color attributes account for approximately 0.68 MiB of dynamic upload on a real model/display change; static per-chunk index buffers are not re-uploaded. Camera movement can change only which wholly off-screen chunks are submitted; it cannot change topology, recompute model values, or upload attributes.

The first approved width-150, spacing-3 prototype retained 390,150 line segments but measured only 4 FPS in the shared software-rendered desktop environment. Frustum-only chunking reduced visible vertices by 55.8% but measured about 4.4 FPS. After explicit approval to reduce uniform visual density, spacing 5 lowered capacity to 86,490 segments. The accepted 64-chunk result measured 10.5 FPS default desktop, 13.3 FPS near-body, and 22.5 FPS at 390×844. These figures compare software rendering rather than reference GPU capacity; they document the tradeoff and do not claim a 60 FPS hardware result.

The final v0.6.2 production bundle is 563.03 kB JavaScript raw / 142.45 kB gzip and 11.61 kB CSS / 3.38 kB gzip. The v0.6.1 JavaScript result was 554.63 / 139.66 kB. Chunking, diagnostics, the horizon shader, and the frame scheduler account for the measured increase; the existing 500 kB warning remains.

The committed `npm run test:soak` harness runs for 10 minutes by default and samples every 10 seconds: actual UI FPS, JS heap where Chromium exposes it, DOM nodes, grid recomputations/uploads, visible chunks/vertices, animation/render frames, draw calls, geometries, and textures. It fails on browser errors, DOM/resource growth, stationary grid dirtiness, or end-to-end JS heap growth over the documented 32 MiB allowance.

The 2026-08-04 automated run collected 61 samples over 10 minutes. DOM delta was 0; geometry delta 0; texture delta 0; grid recomputation delta 0; grid upload delta 0; and browser errors 0. Heap ended 3,502,376 bytes below its starting value, while the observed GC range was 68,383,852 bytes. Reported headless FPS ranged from 12 to 20, averaging 17.49; the first ten samples averaged 14.7 and the last ten 19.0. This shared software-rendered environment does not establish hardware FPS capacity, but it shows no continuous FPS decline correlated with application resource growth. No reproduced leak is claimed fixed.

`npm run test:benchmark` records the default, near-body, far-grid, 30 FPS, 60 FPS, unlimited, desktop, and 390×844 mobile scenarios. Capped results are interpreted against hardware capacity: a cap is a maximum, not a promise that slower hardware will attain it.

| Scenario | Reported FPS avg / low | Visible grid vertices | Grid objects | Scene draw calls |
| --- | ---: | ---: | ---: | ---: |
| Desktop default 60 cap | 10.50 / 10 | 97,060 | 37 | 42 |
| Desktop 30 cap | 11.50 / 10 | 97,060 | 37 | 42 |
| Desktop 60 cap | 11.50 / 10 | 97,060 | 37 | 42 |
| Desktop unlimited | 11.00 / 10 | 97,060 | 37 | 42 |
| Desktop near body | 13.33 / 12 | 67,140 | 26 | 31 |
| Desktop far grid | 11.33 / 10 | 97,060 | 37 | 42 |
| Mobile 390×844 unlimited | 22.50 / 20 | 75,492 | 29 | 34 |

The accepted architecture retains a 0.0041666667-second physics step, one grid recomputation, and two initial shared grid-attribute uploads. Visible counts vary only through whole-chunk frustum intersection; no distance threshold or topology reduction is involved.

A one-minute post-change soak sampled the accepted uniform grid every ten seconds. DOM, geometry, texture, grid-recomputation, and grid-upload deltas were all zero. Heap ended 1,541,281 bytes below its starting value within a 2,810,135-byte observed GC range. This short run verifies stationary dirty-state behavior but does not replace the committed ten-minute procedure or prove the absence of every memory leak.

The current CI workflow intentionally retains its single ruleset-compatible `verify` check. Splitting it into stable `lint`, `test`, `build`, and `smoke` jobs is tracked separately in issue #20 so branch protection can be migrated atomically.

This document defines repeatable measurements. Record browser version, operating system, hardware, viewport, device-pixel ratio, commit SHA, simulation mode, mass, W distance, grid parameters, trail capacity, and sampling duration with every result.

## v0.6.1 structural comparison

| Metric | Before v0.6.1 | v0.6.1 | Interpretation |
| --- | ---: | ---: | --- |
| Grid world-space width | 24 | 150 | finite approved domain |
| Nominal spacing | 2 | 3 | uniform throughout the domain |
| Grid line vertices | 12,168 | 69,828 | bounded below 70,000 |
| Grid topology vertices | 2,197 object vectors | 12,167 typed entries | raw/display/topology data are reusable typed buffers |
| Grid GPU position + color | ~0.28 MiB | ~1.60 MiB | larger domain with one grid draw call |
| Total grid typed storage | object-backed, not directly comparable | ~2.28 MiB | includes raw values, topology, indices, positions, and colors |
| Trail samples per particle | 256 | 1,024 desktop / 512 mobile | explicit bounded retention |
| Total trail fixed storage at 1,000 particles | ~14.60 MiB | ~58.55 MiB desktop / ~29.25 MiB mobile | allocated at initialization or explicit capacity change only |

The increased fixed memory is an intentional visibility correction and remains bounded. Update, rendering, trail push, and color mapping reuse buffers. Re-run browser frame measurements on representative GPU hardware; geometry counts alone are not an FPS claim.

Production build observed on 2026-08-04 for the earlier branch: HTML 1.80 kB raw / 0.69 kB gzip, CSS 11.55 kB / 3.37 kB, and JavaScript 554.63 kB / 139.66 kB. The earlier recorded JavaScript baseline was approximately 506 kB / 127 kB. The increase included the bilingual dictionary split and legends; tests do not ship in the bundle. Vite's existing 500 kB chunk warning remains a known optimization item.

## Reference scenario

- Production build served locally with `npm run preview`.
- Desktop viewport: 1920 × 1080 at device-pixel ratio 1.
- Default state: GR + W, mass 120, W distance 1.5, uniform grid width 150, spacing 5.
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
