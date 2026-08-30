import { expect, test } from "@playwright/test";

test.setTimeout(150_000);

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("preserves simulation behavior while switching scientific UI locales", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#locale-select")).toHaveValue("en");
  await expect(page.getByRole("heading", { name: "Simulation" })).toBeVisible();
  await expect(page.locator(".version-chip")).toHaveText("v0.8.0");
  await expect(page.locator("#geo-classification")).toHaveText("Stable circular");
  await expect(page.locator("#geo-status")).toHaveText("Active");
  await expect(page.locator("#orbit-preset")).toHaveValue("circular");

  const canvas = page.locator("#viewport canvas");
  await expect(canvas).toHaveCount(1);
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 40, bounds.y + bounds.height / 2 + 20);
  await page.mouse.up();
  await page.mouse.wheel(0, -120);

  await expect(page.locator("#mass")).toHaveCount(0);
  await expect(page.locator("#black-hole-mass")).toHaveAttribute("type", "number");
  await expect(page.locator("#rs")).toHaveText("1.000");
  await expect(page.locator("#vertices")).toHaveText("172,980");

  await expect(page.locator("#trail-color-mode")).toHaveCount(0);
  await expect(page.locator(".speed-gradient")).toBeVisible();
  await expect(page.locator(".grid-gradient")).toBeVisible();
  await expect(page.locator("#speed-legend-max")).toHaveText("2.0");
  await expect(page.locator("#grid-legend-max")).not.toBeEmpty();
  await expect(page.locator("#trail-capacity")).toHaveValue("16384");
  await expect(page.locator("#max-fps")).toHaveValue("60");
  await page.locator("#max-fps").selectOption("30");
  await page.locator("#trail-capacity").selectOption("4096");
  await expect(page.locator("#trail-capacity")).toHaveValue("4096");

  await page.locator("#time-scale").selectOption("2");
  await expect(page.locator("#runtime-time-scale")).toHaveText("2x");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedTime = await page.locator("#simulation-time").textContent();
  const pausedProperTime = await page.locator("#geo-proper-time").textContent();
  await page.waitForTimeout(150);
  await expect(page.locator("#simulation-time")).toHaveText(pausedTime);
  await expect(page.locator("#geo-proper-time")).toHaveText(pausedProperTime);

  const pausedCanvas = await canvas.screenshot();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.55, { steps: 4 });
  await page.mouse.up();
  const movedCanvas = await canvas.screenshot();
  expect(movedCanvas.equals(pausedCanvas)).toBe(false);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator("#orbit-radius").fill("5");
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  await expect(page.locator("#geo-radius")).toContainText("5.000000 rₛ");
  const timeBeforeLocaleSwitch = Number.parseFloat(await page.locator("#simulation-time").textContent());
  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("heading", { name: "시뮬레이션" })).toBeVisible();
  await expect(page.locator("#runtime-time-scale")).toHaveText("2배");
  await expect(page.locator("#max-fps")).toHaveValue("30");
  await expect(page.locator("#trail-capacity")).toHaveValue("4096");
  expect(Number.parseFloat(await page.locator("#simulation-time").textContent())).toBeGreaterThanOrEqual(timeBeforeLocaleSwitch);
  await page.reload();
  await expect(page.locator("#locale-select")).toHaveValue("ko");
  await expect(page.locator("#max-fps")).toHaveValue("30");
  await page.locator("#locale-select").selectOption("en");
  await expect(page.getByRole("heading", { name: "Simulation" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("keeps the precession demo eccentricity-controlled, physical, and draft-applied", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  const initialRadiusDraft = await page.locator("#orbit-radius").inputValue();
  const initialEnergyDraft = await page.locator("#specific-energy").inputValue();
  const initialAngularDraft = await page.locator("#specific-angular-momentum").inputValue();

  await page.locator("#orbit-preset").selectOption("precession");
  await expect(page.locator("#orbit-eccentricity")).toBeEnabled();
  await expect(page.locator("#orbit-eccentricity")).toHaveAttribute("min", "0.05");
  await expect(page.locator("#orbit-eccentricity")).toHaveAttribute("max", "0.5");
  await expect(page.locator("#black-hole-mass")).toBeEnabled();
  await expect(page.locator("#orbit-radius")).toBeDisabled();
  await expect(page.locator("#radial-beta")).toBeDisabled();
  await expect(page.locator("#tangential-beta")).toBeDisabled();
  await expect(page.locator("#specific-energy")).toBeDisabled();
  await expect(page.locator("#specific-angular-momentum")).toBeDisabled();
  await expect(page.locator("#radial-direction")).toBeDisabled();
  await expect(page.locator(".precession-generated-values")).toBeVisible();
  await expect(page.getByRole("button", { name: "Explain Orbit eccentricity e" })).toBeVisible();
  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot())).physics).toEqual(before.physics);

  const p = 9;
  let previousRatio = 1;
  let previousEnergy = null;
  let previousAngularMomentum = null;
  for (const eccentricity of [0.1, 0.3, 0.5]) {
    await page.locator("#orbit-eccentricity").fill(String(eccentricity));
    const denominator = p - 3 - eccentricity ** 2;
    const expectedPeriapsis = p / (2 * (1 + eccentricity));
    const expectedApocenter = p / (2 * (1 - eccentricity));
    const expectedEnergy = Math.sqrt(
      ((p - 2 - 2 * eccentricity) * (p - 2 + 2 * eccentricity)) / (p * denominator),
    );
    const expectedAngularMomentum = p / (2 * Math.sqrt(denominator));
    const lapseSquared = 1 - 1 / expectedPeriapsis;
    const gamma = expectedEnergy / Math.sqrt(lapseSquared);
    const expectedTangentialBeta = expectedAngularMomentum / (gamma * expectedPeriapsis);
    const ratio = expectedApocenter / expectedPeriapsis;

    expect(p).toBeGreaterThan(6 + 2 * eccentricity);
    expect(expectedPeriapsis).toBeGreaterThan(1.001);
    expect(expectedApocenter).toBeLessThanOrEqual(10);
    expect(expectedEnergy).toBeLessThan(1);
    expect(expectedTangentialBeta).toBeLessThan(1);
    expect(Number(await page.locator("#orbit-radius").inputValue())).toBeCloseTo(expectedPeriapsis, 12);
    expect(Number(await page.locator("#specific-energy").inputValue())).toBeCloseTo(expectedEnergy, 12);
    expect(Number(await page.locator("#specific-angular-momentum").inputValue())).toBeCloseTo(expectedAngularMomentum, 12);
    expect(Number(await page.locator("#radial-beta").inputValue())).toBe(0);
    expect(Number(await page.locator("#tangential-beta").inputValue())).toBeCloseTo(expectedTangentialBeta, 12);
    expect(Number.parseFloat(await page.locator("#precession-periapsis").textContent())).toBeCloseTo(expectedPeriapsis, 5);
    expect(Number.parseFloat(await page.locator("#precession-apocenter").textContent())).toBeCloseTo(expectedApocenter, 5);
    expect(ratio).toBeGreaterThan(previousRatio);
    if (previousEnergy !== null) expect(expectedEnergy).not.toBe(previousEnergy);
    if (previousAngularMomentum !== null) expect(expectedAngularMomentum).not.toBe(previousAngularMomentum);
    previousRatio = ratio;
    previousEnergy = expectedEnergy;
    previousAngularMomentum = expectedAngularMomentum;
    expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot())).physics).toEqual(before.physics);
  }

  const expectedAtHalf = {
    radius: 3,
    energy: Math.sqrt(((9 - 2 - 1) * (9 - 2 + 1)) / (9 * (9 - 3 - 0.25))),
    angularMomentum: 9 / (2 * Math.sqrt(9 - 3 - 0.25)),
  };
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  const applied = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(applied.physics.status).toBe("Active");
  expect(applied.physics.classification).toBe("BoundNonCircular");
  expect(applied.physics.radius).toBeCloseTo(expectedAtHalf.radius, 12);
  expect(applied.physics.energy).toBeCloseTo(expectedAtHalf.energy, 12);
  expect(applied.physics.angularMomentum).toBeCloseTo(expectedAtHalf.angularMomentum, 12);
  expect(applied.physics.radialVelocity).toBeCloseTo(0, 10);
  expect(Math.abs(Number(await page.locator("#geo-normalization").textContent()))).toBeLessThan(1e-10);

  const massBeforeDraft = applied.snapshot.massSolar;
  await page.locator("#black-hole-mass").fill(String(massBeforeDraft * 2));
  await page.locator("#orbit-eccentricity").fill("0.3");
  const beforeMassApply = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(beforeMassApply.snapshot.massSolar).toBe(massBeforeDraft);
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  const massApplied = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(massApplied.snapshot.massSolar).toBe(massBeforeDraft * 2);
  expect(massApplied.physics.radius).toBeCloseTo(9 / (2 * 1.3), 12);

  const validPhysics = massApplied.physics;
  await page.locator("#orbit-eccentricity").evaluate((input) => {
    input.max = "0.7";
    input.value = "0.6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#orbit-error")).toBeVisible();
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot())).physics).toEqual(validPhysics);

  await page.locator("#orbit-preset").selectOption("constants");
  await expect(page.locator("#orbit-radius")).toBeEnabled();
  await expect(page.locator("#specific-energy")).toBeEnabled();
  await expect(page.locator("#specific-angular-momentum")).toBeEnabled();
  await expect(page.locator("#radial-direction")).toBeEnabled();
  await expect(page.locator("#orbit-radius")).toHaveValue(initialRadiusDraft);
  await expect(page.locator("#specific-energy")).toHaveValue(initialEnergyDraft);
  await expect(page.locator("#specific-angular-momentum")).toHaveValue(initialAngularDraft);

  await page.locator("#locale-select").selectOption("ko");
  await page.locator("#orbit-preset").selectOption("precession");
  await expect(page.getByText("궤도 이심률", { exact: true })).toBeVisible();
  await expect(page.getByText("선택한 이심률에서 자동으로 계산된 물리값입니다.", { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("applies one numeric mass input without mutating the active orbit draft", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const initial = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());

  const mass = page.locator("#black-hole-mass");
  await mass.fill("1.25e7");
  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot())).snapshot.schwarzschildRadiusMetres)
    .toBe(initial.snapshot.schwarzschildRadiusMetres);
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  const applied = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(applied.snapshot.schwarzschildRadiusMetres).toBeGreaterThan(initial.snapshot.schwarzschildRadiusMetres);
  expect(applied.grid.appliedMassSolar).toBe(1.25e7);
  expect(applied.grid.recomputations).toBe(initial.grid.recomputations + 1);
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot())).grid.recomputations)
    .toBe(applied.grid.recomputations);

  await mass.fill("0");
  await page.getByRole("button", { name: "Apply Initial Condition" }).click();
  await expect(page.locator("#orbit-error")).toBeVisible();
  await mass.fill("1.25e7");

  const afterInvalidDraft = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(afterInvalidDraft.physics).toEqual(applied.physics);
  expect(consoleErrors).toEqual([]);
});

test("focuses and follows the particle through final render coordinates", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.locator("#time-scale").selectOption("100");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Focus Particle" }).click();
  const focused = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(focused.camera.targetX).toBeCloseTo(focused.snapshot.x, 5);
  expect(focused.camera.targetY).toBeCloseTo(focused.snapshot.y, 5);
  expect(focused.camera.targetZ).toBeCloseTo(focused.snapshot.z, 5);
  await page.getByLabel("Follow Particle").check();
  const before = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(400);
  const followed = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(followed.camera.followingParticle).toBe(true);
  expect(followed.camera.targetZ).not.toBe(before.camera.targetZ);
  const beforeOffset = [before.camera.x - before.camera.targetX, before.camera.y - before.camera.targetY, before.camera.z - before.camera.targetZ];
  const afterOffset = [followed.camera.x - followed.camera.targetX, followed.camera.y - followed.camera.targetY, followed.camera.z - followed.camera.targetZ];
  afterOffset.forEach((value, index) => expect(value).toBeCloseTo(beforeOffset[index], 4));
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.locator("#scale-mode").selectOption("physical");
  const physical = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(physical.camera.targetX).toBeCloseTo(physical.snapshot.x, 4);
  await page.getByLabel("Follow Particle").uncheck();
  expect(consoleErrors).toEqual([]);
});

test("changes custom clock speed and display units without resetting simulation state", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__GR4D_DIAGNOSTICS__?.getSnapshot().physicsUpdates > 0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());

  await page.locator("#time-scale").selectOption("custom");
  await page.locator("#custom-time-scale").fill("37.5");
  await page.locator("#apply-time-scale").click();
  await expect(page.locator("#runtime-time-scale")).toHaveText("37.5x");
  const afterScale = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(afterScale.runtime.timeScale).toBe(37.5);
  expect(afterScale.physics).toEqual(before.physics);
  expect(afterScale.snapshot.revision).toBe(before.snapshot.revision);

  await page.locator("#custom-time-scale").fill("0");
  await page.locator("#apply-time-scale").click();
  await expect(page.locator("#time-scale-error")).toBeVisible();
  expect((await page.locator("#time-scale-error").textContent()).length).toBeGreaterThan(10);

  const physicalRadius = before.snapshot.radiusMetres;
  await page.locator("#display-unit-mode").selectOption("si");
  await expect(page.locator("#geo-radius")).toContainText("m");
  await page.locator("#display-unit-mode").selectOption("astronomical");
  await expect(page.locator("#geo-radius")).toContainText("AU");
  expect(await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().snapshot.radiusMetres)).toBe(physicalRadius);
  await page.reload();
  await expect(page.locator("#display-unit-mode")).toHaveValue("astronomical");
  expect(consoleErrors).toEqual([]);
});

test("keeps bilingual drawers and legends usable on mobile", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Simulation", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await expect(page.locator("#visual-settings-panel")).toBeFocused();
  await expect(page.locator("#trail-capacity")).toHaveValue("16384");
  await expect(page.locator(".speed-gradient")).toBeVisible();
  await page.getByRole("button", { name: "Close visual settings", exact: true }).click();

  await page.locator("#locale-select").selectOption("ko");
  await expect(page.getByRole("button", { name: "시뮬레이션", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "시각 설정", exact: true }).click();
  await expect(page.getByText("현재 입자 속도", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "시각 설정 닫기", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole("button", { name: "시뮬레이션", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});

test("keeps the scientific dashboard within all approved responsive viewports", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  const viewports = [
    { width: 1600, height: 1000 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const locale of ["en", "ko"]) {
      await page.locator("#locale-select").selectOption(locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await expect(page.locator("#viewport canvas")).toHaveCount(1);
    }
  }
  expect(consoleErrors).toEqual([]);
});

test("opens bilingual scientific guidance without resetting simulation state", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  const before = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().runtime.simulationTime);
  await page.locator("#open-guide").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scientific User Guide" })).toBeVisible();
  await page.locator("#locale-select").selectOption("ko");
  await expect(page.getByRole("heading", { name: "과학 사용자 안내서" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  const after = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().runtime.simulationTime);
  expect(after).toBeGreaterThan(before);
  expect(consoleErrors).toEqual([]);
});

test("advances the geodesic particle through snapshots and GPU input while running", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__GR4D_DIAGNOSTICS__?.getSnapshot().physicsUpdates > 0);

  const initial = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await page.waitForTimeout(500);
  const running = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());

  expect(initial.runtime.running).toBe(true);
  expect(initial.runtime.paused).toBe(false);
  expect(running.lastPhysicsDelta).toBe(1 / 240);
  expect(running.physicsUpdates).toBeGreaterThan(initial.physicsUpdates);
  expect(running.physics.phi).toBeGreaterThan(initial.physics.phi);
  expect(running.particle.z).toBeGreaterThan(initial.particle.z);
  expect(running.snapshot.z).toBe(running.particle.z);
  expect(running.particleRenderer.z).toBeCloseTo(running.snapshot.z, 6);
  expect(running.snapshot.revision).toBeGreaterThan(initial.snapshot.revision);
  expect(running.particleRenderer.revision).toBeGreaterThan(initial.particleRenderer.revision);

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await page.waitForTimeout(300);
  const pausedLater = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(pausedLater.physicsUpdates).toBe(paused.physicsUpdates);
  expect(pausedLater.physics.phi).toBe(paused.physics.phi);
  expect(pausedLater.particle.z).toBe(paused.particle.z);
  expect(pausedLater.snapshot.revision).toBe(paused.snapshot.revision);

  await page.locator("#time-scale").selectOption("100");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(500);
  const accelerated = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(accelerated.particleRenderer.z - paused.particleRenderer.z).toBeGreaterThan(0.05);
  expect(consoleErrors).toEqual([]);
});

test("switches normalized, physical, and auto-fit views without changing physics", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.waitForFunction(() => window.__GR4D_DIAGNOSTICS__?.getSnapshot().physicsUpdates > 0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();

  const normalized = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(normalized.scale.mode).toBe("normalized");
  expect(normalized.scale.horizonRenderRadius).toBe(1);
  expect(normalized.snapshot.x).toBe(normalized.snapshot.normalizedX);

  await page.locator("#scale-mode").selectOption("physical");
  const physical = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(physical.scale.horizonRenderRadius).toBeCloseTo(
    physical.snapshot.schwarzschildRadiusMetres / physical.scale.metresPerWorldUnit, 10,
  );
  expect(physical.particleRenderer.x).toBeCloseTo(physical.snapshot.x, 4);
  expect(physical.physics).toEqual(normalized.physics);

  const resourcesBefore = physical.renderer;
  const fitCountBefore = physical.scale.fitCount;
  await page.locator("#scale-mode").selectOption("auto-fit-physical");
  const autoFit = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(autoFit.scale.fitCount).toBe(fitCountBefore + 1);
  expect(autoFit.scale.horizonRenderRadius).toBeCloseTo(physical.scale.horizonRenderRadius, 10);
  expect(autoFit.physics).toEqual(normalized.physics);

  await page.evaluate(() => {
    const select = document.querySelector("#scale-mode");
    for (let index = 0; index < 100; index += 1) {
      select.value = index % 2 ? "physical" : "normalized";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.waitForTimeout(100);
  const afterSwitches = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(afterSwitches.renderer.geometries).toBe(resourcesBefore.geometries);
  expect(afterSwitches.renderer.textures).toBe(resourcesBefore.textures);
  expect(afterSwitches.physics).toEqual(normalized.physics);

  await expect(page.locator(".scale-indicator")).toBeVisible();
  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("#scale-mode")).toHaveValue("physical");
  await expect(page.locator("#orbit-radius-km")).toContainText("물리 반지름");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});


test("Particle Inspector follows the selected particle without changing physics", async ({ page }) => {
  const consoleErrors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.locator("#pause").click();
  const physicsBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().physics);
  const point = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getParticleScreenPosition("default-particle"));
  expect(point).not.toBeNull();
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(".particle-inspector")).toBeVisible();
  await expect(page.locator('[data-field="id"]')).toContainText("default-particle");
  let diagnostics = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().inspector);
  expect(diagnostics).toMatchObject({ selectedId: "default-particle", mode: "anchored" });

  const cardBefore = await page.locator(".particle-inspector").boundingBox();
  const canvas = page.locator("#viewport canvas");
  const bounds = await canvas.boundingBox();
  const orbitStart = { x: bounds.x + bounds.width * 0.76, y: bounds.y + bounds.height * 0.28 };
  await page.mouse.move(orbitStart.x, orbitStart.y);
  await page.mouse.down();
  await page.mouse.move(orbitStart.x - 140, orbitStart.y + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  diagnostics = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().inspector);
  expect(diagnostics.selectedId).toBe("default-particle");
  const cardAfterOrbit = await page.locator(".particle-inspector").boundingBox();
  expect(Math.abs(cardAfterOrbit.width - cardBefore.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(cardAfterOrbit.height - cardBefore.height)).toBeLessThanOrEqual(1);
  const projectedAfterOrbit = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getParticleScreenPosition("default-particle"));
  expect(projectedAfterOrbit).not.toBeNull();

  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(120);
  const cardFar = await page.locator(".particle-inspector").boundingBox();
  expect(Math.abs(cardFar.width - cardBefore.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(cardFar.height - cardBefore.height)).toBeLessThanOrEqual(1);
  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().inspector)).selectedId).toBe("default-particle");

  for (const mode of ["normalized", "physical", "auto-fit-physical"]) {
    await page.locator("#scale-mode").selectOption(mode);
    await page.waitForTimeout(80);
    expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().inspector)).selectedId).toBe("default-particle");
  }
  expect(await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().physics)).toEqual(physicsBefore);

  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator(".particle-inspector-kicker")).toHaveText("입자 검사기");
  await expect(page.locator(".particle-inspector-details summary")).toHaveText("상세 정보");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.evaluate(() => document.querySelector("#pause")?.click());
  const mobilePoint = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getParticleScreenPosition("default-particle"));
  expect(mobilePoint).not.toBeNull();
  await page.evaluate(({ x, y }) => {
    const target = document.querySelector("#viewport canvas");
    const originalSetPointerCapture = target.setPointerCapture;
    const originalReleasePointerCapture = target.releasePointerCapture;
    target.setPointerCapture = () => {};
    target.releasePointerCapture = () => {};
    try {
      const init = { bubbles: true, pointerId: 71, pointerType: "touch", isPrimary: true, button: 0, clientX: x, clientY: y };
      target.dispatchEvent(new window.PointerEvent("pointerdown", init));
      target.dispatchEvent(new window.PointerEvent("pointerup", init));
    } finally {
      target.setPointerCapture = originalSetPointerCapture;
      target.releasePointerCapture = originalReleasePointerCapture;
    }
  }, mobilePoint);
  await expect(page.locator(".particle-inspector")).toBeVisible();
  expect((await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot().inspector)).selectedId).toBe("default-particle");
  expect(consoleErrors).toEqual([]);
});
