import { expect, test } from "@playwright/test";

test("preserves the v0.1 browser interaction baseline", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");

  const canvas = page.locator("#viewport canvas");
  await expect(canvas).toHaveCount(1);
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  await page.mouse.move(canvasBounds.x + canvasBounds.width / 2, canvasBounds.y + canvasBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBounds.x + canvasBounds.width / 2 + 40, canvasBounds.y + canvasBounds.height / 2 + 20);
  await page.mouse.up();
  await page.mouse.wheel(0, -120);

  const grButton = page.getByRole("button", { name: "GR 3D" });
  const grWButton = page.getByRole("button", { name: "GR + W" });
  const wInput = page.locator("#w");

  await expect(grWButton).toHaveClass(/active/);
  await grButton.click();
  await expect(grButton).toHaveClass(/active/);
  await expect(wInput).toBeDisabled();

  await grWButton.click();
  await expect(grWButton).toHaveClass(/active/);
  await expect(wInput).toBeEnabled();

  await page.locator("#mass").evaluate((input) => {
    input.value = "200";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#mass-value")).toHaveText("200");
  await expect(page.locator("#rs")).toHaveText("4.000");

  const curvatureBefore = await page.locator("#curvature").textContent();
  await wInput.evaluate((input) => {
    input.value = "3";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#w-value")).toHaveText("3.00");
  await expect(page.locator("#curvature")).not.toHaveText(curvatureBefore);
  await expect(page.locator("#lapse")).not.toBeEmpty();
  await expect(page.locator("#vertices")).not.toBeEmpty();

  await expect(page.locator(".version-chip")).toHaveText("v0.6.0");
  await expect(page.locator("#particle-count")).toHaveText("1");
  await expect(page.locator("#runtime-state")).toHaveText("Running");

  const timeScale = page.locator("#time-scale");
  await expect(timeScale.locator("option")).toHaveCount(8);
  await timeScale.selectOption("2");
  await expect(page.locator("#runtime-time-scale")).toHaveText("2x");

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#runtime-state")).toHaveText("Paused");
  const pausedTime = await page.locator("#simulation-time").textContent();
  await page.waitForTimeout(150);
  await expect(page.locator("#simulation-time")).toHaveText(pausedTime);

  const pausedCanvas = await canvas.screenshot();
  await page.mouse.move(canvasBounds.x + canvasBounds.width * 0.7, canvasBounds.y + canvasBounds.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(canvasBounds.x + canvasBounds.width * 0.8, canvasBounds.y + canvasBounds.height * 0.55, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const movedCanvas = await canvas.screenshot();
  expect(movedCanvas.equals(pausedCanvas)).toBe(false);

  await page.getByRole("button", { name: "Reset Particle", exact: true }).click();
  await expect(page.locator("#particle-count")).toHaveText("1");
  await page.getByRole("button", { name: "Reset All", exact: true }).click();
  await expect(page.locator("#simulation-time")).toHaveText("0.00 s");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("#runtime-state")).toHaveText("Running");

  const particleSize = page.locator("#particle-size");
  await particleSize.evaluate((input) => {
    input.value = "0.6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator('[data-output="particle-size"]')).toHaveText("0.60");
  await page.locator("#trail-color-mode").selectOption("age");
  await expect(page.locator("#trail-mode-description")).toContainText("oldest to newest");
  await page.getByRole("button", { name: "Reset Visuals", exact: true }).click();
  await expect(particleSize).toHaveValue("0.36");
  await expect(page.locator("#particle-count")).toHaveText("1");

  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page.getByRole("button", { name: "Toggle fullscreen", exact: true }).click();
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await page.getByRole("button", { name: "Toggle fullscreen", exact: true }).click();
  await page.getByRole("button", { name: "Hide side panels", exact: true }).click();
  await expect(page.locator("#app")).toHaveClass(/panels-hidden/);
  await page.getByRole("button", { name: "Show Panels", exact: true }).click();
  await expect(page.locator("#app")).not.toHaveClass(/panels-hidden/);

  expect(consoleErrors).toEqual([]);
});

test("keeps the scientific dashboard usable on mobile", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#viewport canvas")).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Simulation", exact: true }).click();
  const simulationPanel = page.locator("#control-panel");
  await expect(simulationPanel).toBeVisible();
  await expect(simulationPanel).toBeFocused();
  const closeSimulation = page.locator("#control-panel").getByRole("button", { name: "Close simulation controls", exact: true });
  await closeSimulation.click();

  await page.getByRole("button", { name: "Visuals", exact: true }).click();
  await expect(page.locator("#visual-settings-panel")).toBeVisible();
  await page.locator("#visual-settings-panel").getByRole("button", { name: "Close visual settings", exact: true }).click();
  await expect(page.locator("#panel-backdrop")).toBeHidden();
  await expect(page.getByRole("button", { name: "Visuals", exact: true })).toBeFocused();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole("button", { name: "Simulation", exact: true })).toBeVisible();
  const landscapeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(landscapeOverflow).toBeLessThanOrEqual(0);
  expect(consoleErrors).toEqual([]);
});
