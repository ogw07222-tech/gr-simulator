import { expect, test } from "@playwright/test";

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("keeps the scientific scene visible through repeated scale-mode changes", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = collectErrors(page);
  await page.goto("/");
  await page.locator("#locale-select").selectOption("en");
  await page.waitForFunction(() => window.__GR4D_DIAGNOSTICS__?.getSnapshot().physicsUpdates > 0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();

  const before = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  await expect(page.locator("#grid-deformation-gain")).toHaveValue("1");
  for (const gain of ["5", "10", "1"]) {
    await page.locator("#grid-deformation-gain").selectOption(gain);
  }
  await page.evaluate(() => {
    const select = document.querySelector("#scale-mode");
    const modes = ["physical", "auto-fit-physical", "normalized"];
    for (let index = 0; index < 100; index += 1) {
      select.value = modes[index % modes.length];
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.locator("#scale-mode").selectOption("physical");
  await page.waitForTimeout(100);

  const snapshot = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
  const cameraDistance = Math.hypot(
    snapshot.camera.x - snapshot.camera.targetX,
    snapshot.camera.y - snapshot.camera.targetY,
    snapshot.camera.z - snapshot.camera.targetZ,
  );
  const fogDensity = snapshot.renderer.fogDensity ?? 0.018;
  const fogTransmittance = Math.exp(-((fogDensity * cameraDistance) ** 2));

  expect(snapshot.physics).toEqual(before.physics);
  expect(snapshot.particle).toEqual(before.particle);
  expect(snapshot.runtime.simulationTime).toBe(before.runtime.simulationTime);
  expect([
    snapshot.camera.x, snapshot.camera.y, snapshot.camera.z,
    snapshot.camera.targetX, snapshot.camera.targetY, snapshot.camera.targetZ,
    snapshot.camera.near, snapshot.camera.far,
    snapshot.particleRenderer.x, snapshot.particleRenderer.y, snapshot.particleRenderer.z,
    snapshot.scale.horizonRenderRadius,
  ].every(Number.isFinite)).toBe(true);
  expect(snapshot.camera.near).toBeGreaterThan(0);
  expect(snapshot.camera.far).toBeGreaterThan(snapshot.camera.near);
  expect(snapshot.renderer.drawCalls).toBeGreaterThan(0);
  expect(snapshot.renderer.lines + snapshot.renderer.points).toBeGreaterThan(0);
  expect(fogTransmittance).toBeGreaterThan(0.02);
  expect(consoleErrors).toEqual([]);
});
