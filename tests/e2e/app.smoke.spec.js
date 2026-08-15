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
  await expect(page.locator(".version-chip")).toHaveText("v0.7.5");
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

  await page.getByRole("button", { name: "GR 3D" }).click();
  await expect(page.locator("#w")).toBeDisabled();
  await page.getByRole("button", { name: "GR + W" }).click();
  await expect(page.locator("#w")).toBeEnabled();
  await page.locator("#mass").evaluate((input) => {
    input.value = "200";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#rs")).toHaveText("4.000");
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
