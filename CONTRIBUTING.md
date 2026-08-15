# Contributing

## Before changing code

1. Open or reference an issue describing the physical, architectural, or performance motivation.
2. Identify the existing behavior that must remain stable.
3. For physics changes, provide a reference equation, unit convention, expected domain, and numerical tolerance.
4. For rendering changes, record a baseline frame time, allocation profile, and draw-call count when applicable.

## Local workflow

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run test:smoke
```

Install Chromium once with `npx playwright install chromium` before running browser smoke tests. Preserve the existing JavaScript style: ES modules, double quotes, semicolons, two-space indentation, trailing commas in multiline literals, and explicit `dispose()` methods for owned resources.

## Module rules

- `core`: shared runtime primitives; no Three.js or DOM imports.
- `physics`: equations and numerical models; no rendering or UI imports.
- `rendering`: Three.js adapters; consumes physics results without owning physics truth.
- `ui`: user input and interactive DOM controls.
- `hud`: read-only state projection and metric formatting.
- `systems`: clocks, lifecycle, and subsystem orchestration.
- `utils`: small domain-neutral helpers only.

Dependencies should flow from presentation/orchestration toward public core and physics contracts. Circular dependencies and deep cross-directory imports require an architecture decision record.

## Pull requests

- Keep structural, numerical, and visual changes in separate commits or PRs.
- State what changed, why, user impact, physical assumptions, and validation performed.
- Include `npm run build` results.
- Confirm that existing controls, camera behavior, metrics, and cleanup still work.
- Do not commit generated output, dependency directories, or local credentials.

## Release validation matrix

For prerelease versions `0.x.y`, `x` means the minor component and `y` means the patch component.

| Release type | English visual audit | Korean visual audit | Locale parity tests |
| --- | --- | --- | --- |
| Patch `0.x.y` → `0.x.(y+1)` | Full, all supported viewports | Targeted affected surfaces only | Required |
| Minor `0.x.y` → `0.(x+1).0` | Full, all supported viewports | Full, all supported viewports | Required |
| Major `0.x.y` → `1.0.0` | Full, all supported viewports | Full, all supported viewports | Required |

Every patch still runs Korean/English dictionary parity, automated localization tests, and build checks. A patch must also validate Korean visually when it changes Korean strings, localization architecture, fonts or typography, text wrapping or widths, localized accordion/help/guide content, locale persistence/switching, or responsive UI structure. Test only the affected Korean surfaces when the change is narrow; use the full bilingual matrix when its impact is broad. Korean functional automation is never optional.

## Performance and research quality

- Benchmark before and after changing a hot path.
- Avoid allocations inside animation and grid-update loops.
- Prefer typed arrays and reused buffers for batch numerical work.
- Document precision, stability limits, and failure behavior.
- Never present a visualization proxy as a physical observable.
