import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(content, from, to, label) {
  const first = content.indexOf(from);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (content.indexOf(from, first + from.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  return content.slice(0, first) + to + content.slice(first + from.length);
}

// 1) Make runtime photon progression explicitly coordinate-time driven.
{
  const path = "src/physics/relativity/SchwarzschildNullGeodesicSystem.js";
  let source = read(path);
  const anchor = `\n  nullCondition(values = this.state.values) {`;
  const methods = `
  advanceCoordinateTimeSI(deltaSeconds) {
    if (this.status !== PhotonStatus.ACTIVE || deltaSeconds === 0) return 0;
    if (!(deltaSeconds > 0) || !Number.isFinite(deltaSeconds)) {
      throw new RangeError("Coordinate-time advance must be positive and finite.");
    }
    return this.advanceCoordinateTime(this.units.siTimeToNormalized(deltaSeconds));
  }

  advanceCoordinateTime(deltaTime) {
    if (this.status !== PhotonStatus.ACTIVE || deltaTime === 0) return 0;
    if (!(deltaTime > 0) || !Number.isFinite(deltaTime)) {
      throw new RangeError("Normalized coordinate-time advance must be positive and finite.");
    }

    const targetTime = this.state.values[I.TIME] + deltaTime;
    let completed = 0;
    let steps = 0;
    while (this.status === PhotonStatus.ACTIVE
      && this.state.values[I.TIME] < targetTime
      && steps < this.maximumSubsteps) {
      const radius = this.state.values[I.RADIUS];
      const lapseSquared = SchwarzschildMetric.lapseSquared(radius);
      const dtDlambda = this.state.energy / lapseSquared;
      const remainingTime = targetTime - this.state.values[I.TIME];
      const affineStep = Math.min(this.maximumAffineStep, remainingTime / dtDlambda);
      if (!(affineStep > 0) || !Number.isFinite(affineStep)) {
        this.status = PhotonStatus.NUMERICAL_FAILURE;
        break;
      }
      const beforeTime = this.state.values[I.TIME];
      const advanced = this.advanceAffine(affineStep);
      completed += advanced;
      steps += 1;
      if (advanced === 0 || this.state.values[I.TIME] <= beforeTime) break;
    }
    if (this.status === PhotonStatus.ACTIVE
      && this.state.values[I.TIME] < targetTime
      && steps >= this.maximumSubsteps) {
      this.status = PhotonStatus.NUMERICAL_FAILURE;
    }
    return completed;
  }
`;
  source = replaceOnce(source, anchor, `${methods}${anchor}`, "null coordinate-time methods");
  write(path, source);
}

// 2) Feed runtime SI simulation seconds to the null solver as coordinate-time progression.
{
  const path = "src/systems/photons/PhotonSubsystem.js";
  let source = read(path);
  source = replaceOnce(
    source,
    `    const deltaAffine = this.units.siTimeToNormalized(deltaSeconds);\n    let completedTotal = 0;`,
    `    let completedTotal = 0;`,
    "remove direct affine/runtime mapping",
  );
  source = replaceOnce(
    source,
    `      const completed = ray.geodesic.advanceAffine(deltaAffine);`,
    `      const completed = ray.geodesic.advanceCoordinateTimeSI(deltaSeconds);`,
    "coordinate-time photon advance",
  );
  source = replaceOnce(
    source,
    `  reset() {\n    this.#rebuildRays();\n    return this;\n  }\n\n  update(deltaSeconds) {`,
    `  reset() {\n    this.#rebuildRays();\n    return this;\n  }\n\n  recommendedRuntimeTimeScale() {\n    // The global runtime multiplier is dimensionless. Setting it to r_s/c in SI\n    // seconds makes one wall-clock second advance about one normalized\n    // Schwarzschild coordinate-time unit while preserving the same global clock\n    // for massive and null trajectories. This is a viewing cadence, not a\n    // photon-only displacement multiplier.\n    return Math.max(1, this.units.timeScale);\n  }\n\n  update(deltaSeconds) {`,
    "recommended photon observation time scale",
  );
  write(path, source);
}

// 3) On the untouched default 1x clock, enabling photons selects the smallest
// existing global time-scale preset that reaches one Schwarzschild time unit per wall second.
{
  const path = "src/main.js";
  let source = read(path);
  source = replaceOnce(
    source,
    `const photonSubsystem = new PhotonSubsystem({\n  massSolar: geodesicSubsystem.configuration.massSolar,\n  maxTrailLength: photonRenderer.maxTrailLength,\n  renderer: photonRenderer,\n});\nconst particleInspector = resources.register(new ParticleInspector(`,
    `const photonSubsystem = new PhotonSubsystem({\n  massSolar: geodesicSubsystem.configuration.massSolar,\n  maxTrailLength: photonRenderer.maxTrailLength,\n  renderer: photonRenderer,\n});\nfunction ensurePhotonObservationTimeScale() {\n  if (simulationState.timeScale !== 1) return simulationState.timeScale;\n  const required = photonSubsystem.recommendedRuntimeTimeScale();\n  let next = TIME_SCALES[TIME_SCALES.length - 1];\n  for (const scale of TIME_SCALES) {\n    if (scale >= required) { next = scale; break; }\n  }\n  if (next > simulationState.timeScale) clock.setTimeScale(next);\n  return simulationState.timeScale;\n}\nconst particleInspector = resources.register(new ParticleInspector(`,
    "photon observation time-scale helper",
  );
  source = replaceOnce(
    source,
    `    onToggle: (enabled) => photonSubsystem.setEnabled(enabled),`,
    `    onToggle: (enabled) => {\n      const applied = photonSubsystem.setEnabled(enabled);\n      if (applied) ensurePhotonObservationTimeScale();\n      return applied;\n    },`,
    "photon toggle runtime scale",
  );
  write(path, source);
}

// 4) Remove only telemetry rows that semantically duplicate Particle Inspector.
{
  const path = "src/ui/ControlPanel.js";
  let source = read(path);
  for (const line of [
    `        <div><small data-i18n="geodesic.radius"></small><strong id="geo-radius"></strong></div>\n`,
    `        <div><small data-i18n="geodesic.localSpeed"></small><strong id="geo-speed"></strong></div>\n`,
    `        <div><small><span data-i18n="geodesic.coordinateTime"></span>\${helpButton("coordinateTime")}</small><strong id="geo-coordinate-time"></strong></div>\n`,
    `        <div><small><span data-i18n="geodesic.properTime"></span>\${helpButton("properTime")}</small><strong id="geo-proper-time"></strong></div>\n`,
    `        <div><small><span data-i18n="geodesic.energy"></span>\${helpButton("specificEnergy")}</small><strong id="geo-energy"></strong></div>\n`,
    `        <div><small><span data-i18n="geodesic.angularMomentum"></span>\${helpButton("angularMomentum")}</small><strong id="geo-angular-momentum"></strong></div>\n`,
    `        <div><small><span data-i18n="geodesic.classification"></span>\${helpButton("classification")}</small><strong id="geo-classification"></strong></div>\n`,
    `        <div><small data-i18n="geodesic.status"></small><strong id="geo-status"></strong></div>\n`,
  ]) source = replaceOnce(source, line, "", `remove duplicate row ${line.slice(0, 50)}`);

  source = replaceOnce(
    source,
    `    this.geodesicView.paused = runtimeState?.paused ?? false;\n`,
    ``,
    "remove obsolete paused geodesic presentation binding",
  );
  source = replaceOnce(
    source,
    `  syncGeodesic(snapshot, runtimeState = null) {`,
    `  syncGeodesic(snapshot) {`,
    "remove obsolete syncGeodesic runtime argument",
  );
  for (const line of [
    `    this.root.querySelector("#geo-radius").textContent = \`\${snapshot.radiusRs.toFixed(6)} rₛ / \${this.unitFormatter?.formatDistance(snapshot.radiusMetres) ?? \`\${format(snapshot.radiusMetres)} m\`}\`;\n`,
    `    this.root.querySelector("#geo-speed").textContent = this.unitFormatter?.formatVelocity(snapshot.localSpeedMetresPerSecond) ?? \`\${format(snapshot.localSpeedMetresPerSecond)} m/s\`;\n`,
    `    this.root.querySelector("#geo-coordinate-time").textContent = this.unitFormatter?.formatTime(snapshot.coordinateTime) ?? \`\${format(snapshot.coordinateTime)} s\`;\n`,
    `    this.root.querySelector("#geo-proper-time").textContent = this.unitFormatter?.formatTime(snapshot.properTime) ?? \`\${format(snapshot.properTime)} s\`;\n`,
    `    this.root.querySelector("#geo-energy").textContent = snapshot.energy.toFixed(10);\n`,
    `    this.root.querySelector("#geo-angular-momentum").textContent = \`\${snapshot.angularMomentum.toFixed(8)} / \${format(snapshot.angularMomentumSI)} m²/s\`;\n`,
    `    this.root.querySelector("#geo-classification").textContent = t(\`orbit.classification.\${snapshot.orbitClassification}\`);\n`,
    `    this.root.querySelector("#geo-status").textContent = t(\`orbit.status.\${this.geodesicView.paused ? "Paused" : snapshot.geodesicStatus}\`);\n`,
  ]) source = replaceOnce(source, line, "", `remove duplicate writer ${line.slice(0, 55)}`);
  write(path, source);
}

// 5) Remove dead base-HUD labels and make the user guide describe Inspector ownership.
for (const locale of ["en", "ko"]) {
  const path = `src/ui/i18n/${locale}.js`;
  let source = read(path);
  const start = source.indexOf("  geodesic: {");
  const end = source.indexOf("\n  scale: {", start);
  if (start < 0 || end < 0) throw new Error(`Missing geodesic i18n block in ${path}`);
  const block = locale === "en"
    ? `  geodesic: {\n    title: "Scientific Geodesic HUD", mass: "Black-hole mass", schwarzschildRadius: "Schwarzschild radius",\n    energyDrift: "Relative energy drift", angularMomentumDrift: "Relative angular-momentum drift",\n    normalizationResidual: "Four-velocity residual", substeps: "Integrator substeps",\n  },`
    : `  geodesic: {\n    title: "과학 지오데식 HUD", mass: "블랙홀 질량", schwarzschildRadius: "슈바르츠실트 반지름",\n    energyDrift: "상대 에너지 편차", angularMomentumDrift: "상대 각운동량 편차",\n    normalizationResidual: "4-속도 정규화 잔차", substeps: "적분 서브스텝",\n  },`;
  source = source.slice(0, start) + block + source.slice(end);
  if (locale === "en") {
    source = replaceOnce(
      source,
      `    measurements: { title: "Measurements and classifications", body: "The HUD reports coordinate and proper time, radius, local speed, conserved quantities, drift, four-velocity residual, substeps, status, and an observational orbit classification." },`,
      `    measurements: { title: "Measurements and classifications", body: "The selected-object Inspector owns particle radius, local speed, coordinate/proper time, conserved quantities, status, and classification. The base HUD keeps global black-hole context plus numerical drift, four-velocity residual, and integrator substeps." },`,
      "English guide telemetry ownership",
    );
  } else {
    source = replaceOnce(
      source,
      `    measurements: { title: "측정값과 분류", body: "HUD는 좌표·고유 시간, 반지름, 국소 속도, 보존량, 드리프트, 4-속도 잔차, 하위 스텝, 상태와 관측적 궤도 분류를 표시합니다." },`,
      `    measurements: { title: "측정값과 분류", body: "선택한 객체의 Inspector가 입자 반지름, 국소 속도, 좌표·고유 시간, 보존량, 상태와 궤도 분류를 담당합니다. 기본 HUD에는 전역 블랙홀 정보와 수치 드리프트, 4-속도 정규화 잔차, 적분 서브스텝만 남깁니다." },`,
      "Korean guide telemetry ownership",
    );
  }
  write(path, source);
}

// 6) Document the affine/runtime mapping without doing release bookkeeping.
{
  const path = "docs/PHYSICS.md";
  let source = read(path);
  const paragraph = `The legacy grid deformation proxy remains unchanged and is separate from the new particle solver. Production particle motion uses conserved specific energy and angular momentum in a fixed analytic Schwarzschild metric, restricted to massive equatorial test particles. Equations, conventions, and coordinate limitations are defined in \`SCHWARZSCHILD_GEODESICS.md\`; the SI boundary is defined in \`UNIT_SYSTEM.md\`.\n`;
  const addition = `${paragraph}\n## v0.8 photon runtime-time mapping\n\nPhoton runtime updates use Schwarzschild **coordinate time**, not photon proper time and not a direct assumption that affine parameter equals seconds. For each runtime \`deltaSeconds\`, the null solver targets the corresponding SI coordinate-time increment, converts it to normalized Schwarzschild time through \`r_s/c\`, and advances the affine parameter through the existing relation \`dt/dλ = E/f(r)\` while retaining the validated RK4 null equations and affine-step limit. Render positions continue to come only from the integrated authoritative null state.\n\nAt the untouched default 1× global clock, a \`4×10^6 M☉\` black hole has \`r_s/c ≈ 39.4 s\`, so physically correct photon motion is sub-pixel on ordinary frames. When photons are first enabled from that untouched 1× state, the application selects the smallest existing **global** time-scale preset that advances at least one Schwarzschild time unit per wall-clock second (50× for the default mass). This accelerates the whole simulation clock rather than applying any photon-only visual speed multiplier. Explicit user-selected non-default time scales are preserved.\n`;
  source = replaceOnce(source, paragraph, addition, "photon runtime mapping docs");
  write(path, source);
}

// 7) Update old smoke assertions that referenced the removed duplicate HUD rows.
{
  const path = "tests/e2e/app.smoke.spec.js";
  let source = read(path);
  source = replaceOnce(
    source,
    `  await expect(page.locator("#geo-classification")).toHaveText("Stable circular");\n  await expect(page.locator("#geo-status")).toHaveText("Active");`,
    `  const initialPhysics = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().physics);\n  expect(initialPhysics.classification).toBe("StableCircular");\n  expect(initialPhysics.status).toBe("Active");`,
    "existing smoke classification/status ownership",
  );
  source = replaceOnce(
    source,
    `  const pausedProperTime = await page.locator("#geo-proper-time").textContent();\n  await page.waitForTimeout(150);\n  await expect(page.locator("#simulation-time")).toHaveText(pausedTime);\n  await expect(page.locator("#geo-proper-time")).toHaveText(pausedProperTime);`,
    `  const pausedProperTime = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().snapshot.properTime);\n  await page.waitForTimeout(150);\n  await expect(page.locator("#simulation-time")).toHaveText(pausedTime);\n  expect(await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().snapshot.properTime)).toBe(pausedProperTime);`,
    "existing smoke paused proper time",
  );
  source = replaceOnce(
    source,
    `  await expect(page.locator("#geo-radius")).toContainText("5.000000 rₛ");`,
    `  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot())).physics.radius).toBeCloseTo(5, 10);`,
    "existing smoke applied radius",
  );
  source = replaceOnce(
    source,
    `  const physicalRadius = before.snapshot.radiusMetres;\n  await page.locator("#display-unit-mode").selectOption("si");\n  await expect(page.locator("#geo-radius")).toContainText("m");\n  await page.locator("#display-unit-mode").selectOption("astronomical");\n  await expect(page.locator("#geo-radius")).toContainText("AU");\n  expect(await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().snapshot.radiusMetres)).toBe(physicalRadius);`,
    `  const physicalRadius = before.snapshot.schwarzschildRadiusMetres;\n  await page.locator("#display-unit-mode").selectOption("si");\n  await expect(page.locator("#geo-rs")).toContainText("m");\n  await page.locator("#display-unit-mode").selectOption("astronomical");\n  await expect(page.locator("#geo-rs")).toContainText("AU");\n  expect(await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().snapshot.schwarzschildRadiusMetres)).toBe(physicalRadius);`,
    "existing smoke unit display",
  );
  write(path, source);
}

// 8) Deterministic regression: authoritative null state -> snapshot -> renderer all move.
write("tests/unit/photon-runtime-motion.test.js", `import { describe, expect, it } from "vitest";\nimport { PhotonRenderer, PhotonSubsystem } from "../../src/systems/index.js";\n\ndescribe("photon runtime motion regression", () => {\n  it("advances coordinate-time-driven authoritative state and the render buffer", () => {\n    const renderer = new PhotonRenderer({ maxPhotons: 64, maxTrailLength: 32 });\n    const photons = new PhotonSubsystem({ enabled: true, massSolar: 4e6, renderer });\n    photons.applyPreset("strong");\n    photons.render();\n\n    const before = photons.writeSnapshotAt(0, {});\n    const beforeMarker = Array.from(renderer.markerPositions.slice(0, 3));\n    const requestedCoordinateSeconds = 0.5;\n    const completed = photons.update(requestedCoordinateSeconds);\n    const after = photons.writeSnapshotAt(0, {});\n\n    expect(completed).toBeGreaterThan(0);\n    expect(after.affineParameter).toBeGreaterThan(before.affineParameter);\n    expect(after.coordinateTime - before.coordinateTime).toBeCloseTo(requestedCoordinateSeconds, 4);\n    expect(after.radiusMetres).not.toBe(before.radiusMetres);\n    expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeGreaterThan(0);\n    expect(photons.trailAt(0).count).toBeGreaterThan(1);\n    expect(photons.geodesicAt(0).diagnostics.maximumRelativeNullError).toBeLessThan(1e-8);\n\n    expect(photons.render()).toBe(1);\n    const afterMarker = Array.from(renderer.markerPositions.slice(0, 3));\n    expect(afterMarker).not.toEqual(beforeMarker);\n    renderer.dispose();\n  });\n\n  it("derives a global observation multiplier from the Schwarzschild light-crossing time", () => {\n    const photons = new PhotonSubsystem({ massSolar: 4e6 });\n    expect(photons.recommendedRuntimeTimeScale()).toBeGreaterThan(39);\n    expect(photons.recommendedRuntimeTimeScale()).toBeLessThan(40);\n  });\n});\n`);

// 9) Lock the presentation ownership boundary.
write("tests/unit/telemetry-ownership.test.js", `import fs from "node:fs";\nimport { describe, expect, it } from "vitest";\n\ndescribe("base UI telemetry ownership", () => {\n  it("removes selected-particle duplicates while retaining global and unique numerical rows", () => {\n    const source = fs.readFileSync("src/ui/ControlPanel.js", "utf8");\n    for (const id of [\n      "geo-radius", "geo-speed", "geo-coordinate-time", "geo-proper-time",\n      "geo-energy", "geo-angular-momentum", "geo-classification", "geo-status",\n    ]) expect(source).not.toContain(\`id="\${id}"\`);\n    for (const id of [\n      "geo-mass", "geo-rs", "geo-energy-drift", "geo-angular-drift",\n      "geo-normalization", "geo-substeps",\n    ]) expect(source).toContain(\`id="\${id}"\`);\n  });\n});\n`);

// 10) Focused desktop motion + mobile cleanup smoke.
write("tests/e2e/photon-motion-ui.smoke.spec.js", `import { expect, test } from "@playwright/test";\n\nfunction collectErrors(page) {\n  const errors = [];\n  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });\n  page.on("pageerror", (error) => errors.push(error.message));\n  return errors;\n}\n\nasync function clickProjected(page, position) {\n  const canvas = page.locator("#viewport canvas");\n  const box = await canvas.boundingBox();\n  if (!box || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error("Projected object is unavailable");\n  await page.mouse.click(box.x + position.x, box.y + position.y);\n}\n\ntest("photon motion is authoritative, pausable, resumable, and visibly rendered", async ({ page }) => {\n  test.setTimeout(90_000);\n  const errors = collectErrors(page);\n  await page.setViewportSize({ width: 1280, height: 800 });\n  await page.goto("/");\n  await expect(page.locator(".photon-toggle")).toHaveAttribute("aria-pressed", "false");\n\n  await page.locator(".photon-toggle").click();\n  await expect(page.locator(".photon-toggle")).toHaveAttribute("aria-pressed", "true");\n  const enabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(enabled.runtime.timeScale).toBe(50);\n  expect(enabled.photons.enabled).toBe(true);\n\n  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(900);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  const stateAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(stateAfter.photons.affineParameter).toBeGreaterThan(stateBefore.photons.affineParameter);\n  expect(Math.hypot(\n    stateAfter.photonRenderer.markerX - stateBefore.photonRenderer.markerX,\n    stateAfter.photonRenderer.markerY - stateBefore.photonRenderer.markerY,\n    stateAfter.photonRenderer.markerZ - stateBefore.photonRenderer.markerZ,\n  )).toBeGreaterThan(0.2);\n  expect(Math.hypot(screenAfter.x - screenBefore.x, screenAfter.y - screenBefore.y)).toBeGreaterThan(1);\n\n  await page.getByRole("button", { name: "Pause", exact: true }).click();\n  const paused = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(350);\n  const pausedAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(pausedAfter.photons.affineParameter).toBe(paused.photons.affineParameter);\n  expect(pausedAfter.photonRenderer.markerX).toBe(paused.photonRenderer.markerX);\n\n  await page.getByRole("button", { name: "Play", exact: true }).click();\n  await page.waitForTimeout(350);\n  const resumed = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(resumed.photons.affineParameter).toBeGreaterThan(pausedAfter.photons.affineParameter);\n\n  await page.locator(".photon-toggle").click();\n  const off = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(350);\n  const offAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(offAfter.photons.affineParameter).toBe(off.photons.affineParameter);\n  expect(offAfter.photonRenderer.markerVisible).toBe(false);\n  expect(offAfter.photonRenderer.trailVisible).toBe(false);\n\n  await page.locator(".photon-toggle").click();\n  await page.waitForTimeout(350);\n  const reenabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(reenabled.photons.affineParameter).toBeGreaterThan(offAfter.photons.affineParameter);\n\n  const particlePosition = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getParticleScreenPosition("default-particle"));\n  await clickProjected(page, particlePosition);\n  await expect(page.locator(".particle-inspector")).toBeVisible();\n  await expect(page.locator('[data-field="radius"]')).not.toBeEmpty();\n  await expect(page.locator('[data-field="coordinateTime"]')).not.toBeEmpty();\n  await expect(page.locator('[data-field="classification"]')).not.toBeEmpty();\n\n  const photonPosition = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  await clickProjected(page, photonPosition);\n  await expect(page.locator('[data-inspector-kind="photon"]:not([hidden])')).toHaveCount(2);\n  await expect(page.locator('[data-field="photonRadius"]')).not.toBeEmpty();\n  await expect(page.locator('[data-field="photonAffineParameter"]')).not.toBeEmpty();\n\n  await page.locator("#locale-select").selectOption("ko");\n  await expect(page.locator("html")).toHaveAttribute("lang", "ko");\n  await expect(page.locator(".photon-controls-label")).toHaveText("광자");\n  await page.locator("#locale-select").selectOption("en");\n  await expect(page.locator("html")).toHaveAttribute("lang", "en");\n  expect(errors).toEqual([]);\n});\n\ntest("mobile base UI has no duplicate particle telemetry rows or blank retained values", async ({ page }) => {\n  test.setTimeout(60_000);\n  const errors = collectErrors(page);\n  await page.setViewportSize({ width: 390, height: 844 });\n  await page.goto("/");\n  for (const id of [\n    "#geo-radius", "#geo-speed", "#geo-coordinate-time", "#geo-proper-time",\n    "#geo-energy", "#geo-angular-momentum", "#geo-classification", "#geo-status",\n  ]) await expect(page.locator(id)).toHaveCount(0);\n  const retained = page.locator(".scientific-measurements .geodesic-status strong");\n  await expect(retained).toHaveCount(6);\n  for (const text of await retained.allTextContents()) expect(text.trim().length).toBeGreaterThan(0);\n  await page.locator("#locale-select").selectOption("ko");\n  await expect(page.locator("html")).toHaveAttribute("lang", "ko");\n  await page.locator("#locale-select").selectOption("en");\n  expect(errors).toEqual([]);\n});\n`);
