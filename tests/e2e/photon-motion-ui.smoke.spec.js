import { expect, test } from "@playwright/test";

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function clickProjected(page, position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error("Projected object is unavailable");
  await page.mouse.click(position.x, position.y);
}

test("photon motion is authoritative, pausable, resumable, and visibly rendered", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".photon-toggle")).toHaveAttribute("aria-pressed", "false");

  await page.locator(".photon-toggle").click();
  await expect(page.locator(".photon-toggle")).toHaveAttribute("aria-pressed", "true");
  const enabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(enabled.runtime.timeScale).toBe(50);
  expect(enabled.photons.enabled).toBe(true);

  await page.locator(".photon-setup > summary").click();
  await page.locator(".photon-advanced > summary").click();
  await page.locator(".photon-radius").fill("8");
  await page.locator(".photon-phi").fill(String(Math.PI));
  await page.locator(".photon-impact").fill("3");
  await page.locator(".photon-radial").selectOption("-1");
  await page.locator(".photon-angular").selectOption("1");
  await page.locator(".photon-apply").click();
  await page.waitForTimeout(100);
  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));
  expect(screenBefore).not.toBeNull();
  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await page.waitForTimeout(350);
  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));
  expect(screenAfter).not.toBeNull();
  const stateAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(stateAfter.photons.affineParameter).toBeGreaterThan(stateBefore.photons.affineParameter);
  expect(Math.hypot(
    stateAfter.photonRenderer.markerX - stateBefore.photonRenderer.markerX,
    stateAfter.photonRenderer.markerY - stateBefore.photonRenderer.markerY,
    stateAfter.photonRenderer.markerZ - stateBefore.photonRenderer.markerZ,
  )).toBeGreaterThan(0.2);
  expect(Math.hypot(screenAfter.x - screenBefore.x, screenAfter.y - screenBefore.y)).toBeGreaterThan(1);

  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await page.waitForTimeout(350);
  const pausedAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(pausedAfter.photons.affineParameter).toBe(paused.photons.affineParameter);
  expect(pausedAfter.photonRenderer.markerX).toBe(paused.photonRenderer.markerX);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(350);
  const resumed = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(resumed.photons.affineParameter).toBeGreaterThan(pausedAfter.photons.affineParameter);

  await page.locator(".photon-toggle").click();
  const off = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await page.waitForTimeout(350);
  const offAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(offAfter.photons.affineParameter).toBe(off.photons.affineParameter);
  expect(offAfter.photonRenderer.markerVisible).toBe(false);
  expect(offAfter.photonRenderer.trailVisible).toBe(false);

  await page.locator(".photon-toggle").click();
  await page.waitForTimeout(350);
  const reenabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  expect(reenabled.photons.affineParameter).toBeGreaterThan(offAfter.photons.affineParameter);

  const particlePosition = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getParticleScreenPosition("default-particle"));
  await clickProjected(page, particlePosition);
  await expect(page.locator(".particle-inspector")).toBeVisible();
  await expect(page.locator('[data-field="radius"]')).not.toBeEmpty();
  await expect(page.locator('[data-field="coordinateTime"]')).not.toBeEmpty();
  await expect(page.locator('[data-field="classification"]')).not.toBeEmpty();

  const photonPosition = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));
  await clickProjected(page, photonPosition);
  await expect(page.locator('[data-inspector-kind="photon"]:not([hidden])')).toHaveCount(2);
  await expect(page.locator('[data-field="photonRadius"]')).not.toBeEmpty();
  await expect(page.locator('[data-field="photonAffineParameter"]')).not.toBeEmpty();

  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".photon-controls-label")).toHaveText("광자");
  await page.locator("#locale-select").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
});

test("mobile base UI has no duplicate particle telemetry rows or blank retained values", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const id of [
    "#geo-radius", "#geo-speed", "#geo-coordinate-time", "#geo-proper-time",
    "#geo-energy", "#geo-angular-momentum", "#geo-classification", "#geo-status",
  ]) await expect(page.locator(id)).toHaveCount(0);
  const retained = page.locator(".scientific-measurements .geodesic-status strong");
  await expect(retained).toHaveCount(6);
  for (const text of await retained.allTextContents()) expect(text.trim().length).toBeGreaterThan(0);
  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await page.locator("#locale-select").selectOption("en");
  expect(errors).toEqual([]);
});
