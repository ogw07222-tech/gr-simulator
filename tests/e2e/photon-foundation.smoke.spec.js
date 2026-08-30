import { expect, test } from "@playwright/test";

async function diagnostics(page) {
  return page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
}

test("Photon Foundation desktop controls preserve paused massive-particle physics", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.locator("#pause").click();
  const before = await diagnostics(page);

  const toggle = page.locator(".photon-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const count = page.locator(".photon-count");
  await expect(count).toBeVisible();
  await count.selectOption("64");
  expect((await diagnostics(page)).photons.count).toBe(64);

  await page.locator(".photon-setup > summary").click();
  await expect(page.locator(".photon-demo")).toBeVisible();
  await page.locator(".photon-demo").click();
  const demo = await diagnostics(page);
  expect(demo.photons.count).toBe(8);
  expect(demo.photons.preset).toBe("lightBending");
  expect(demo.photonRenderer.markerVisible).toBe(true);

  await toggle.click();
  const after = await diagnostics(page);
  expect(after.photons.enabled).toBe(false);
  expect(after.photonRenderer.markerVisible).toBe(false);
  expect(after.photonRenderer.trailVisible).toBe(false);
  expect(after.physics).toEqual(before.physics);
  expect(consoleErrors).toEqual([]);
});

test("Photon Foundation compact controls remain usable on mobile", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator(".photon-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();
  const count = page.locator(".photon-count");
  await expect(count).toBeVisible();
  await count.selectOption("8");
  await page.locator(".photon-setup > summary").click();
  await expect(page.locator(".photon-demo")).toBeVisible();
  await page.locator(".photon-demo").click();
  const state = await diagnostics(page);
  expect(state.photons.enabled).toBe(true);
  expect(state.photons.count).toBe(8);
  expect(state.photons.preset).toBe("lightBending");
  expect(consoleErrors).toEqual([]);
});
