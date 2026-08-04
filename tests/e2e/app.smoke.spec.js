import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

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
  await expect(page.locator(".version-chip")).toHaveText("v0.6.1");

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
  await expect(page.locator("#vertices")).toHaveText("69,828");

  await expect(page.locator("#trail-color-mode")).toHaveCount(0);
  await expect(page.locator(".speed-gradient")).toBeVisible();
  await expect(page.locator(".grid-gradient")).toBeVisible();
  await expect(page.locator("#speed-legend-max")).toHaveText("2.0");
  await expect(page.locator("#grid-legend-max")).not.toBeEmpty();
  await expect(page.locator("#trail-capacity")).toHaveValue("1024");
  await page.locator("#trail-capacity").selectOption("512");
  await expect(page.locator("#trail-capacity")).toHaveValue("512");

  await page.locator("#time-scale").selectOption("2");
  await expect(page.locator("#runtime-time-scale")).toHaveText("2x");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedTime = await page.locator("#simulation-time").textContent();
  await page.waitForTimeout(150);
  await expect(page.locator("#simulation-time")).toHaveText(pausedTime);

  const pausedCanvas = await canvas.screenshot();
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.55, { steps: 4 });
  await page.mouse.up();
  const movedCanvas = await canvas.screenshot();
  expect(movedCanvas.equals(pausedCanvas)).toBe(false);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  const timeBeforeLocaleSwitch = Number.parseFloat(await page.locator("#simulation-time").textContent());
  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByRole("heading", { name: "시뮬레이션" })).toBeVisible();
  await expect(page.locator("#runtime-time-scale")).toHaveText("2배");
  await expect(page.locator("#trail-capacity")).toHaveValue("512");
  expect(Number.parseFloat(await page.locator("#simulation-time").textContent())).toBeGreaterThanOrEqual(timeBeforeLocaleSwitch);
  await page.reload();
  await expect(page.locator("#locale-select")).toHaveValue("ko");
  await page.locator("#locale-select").selectOption("en");
  await expect(page.getByRole("heading", { name: "Simulation" })).toBeVisible();
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
  await expect(page.locator("#trail-capacity")).toHaveValue("512");
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
