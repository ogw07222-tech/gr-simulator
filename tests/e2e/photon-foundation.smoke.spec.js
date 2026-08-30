import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function diagnostics(page) {
  return page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());
}

async function resetCameraForSmoke(page) {
  await page.evaluate(() => document.querySelector("#reset-camera")?.click());
  await page.waitForTimeout(80);
}

async function firstVisiblePhoton(page, count) {
  return page.evaluate((photonCount) => {
    for (let index = 0; index < photonCount; index += 1) {
      const id = `photon-${index}`;
      const point = window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition(id);
      if (point) return { id, x: point.x, y: point.y };
    }
    return null;
  }, count);
}

async function verifyPhotonStopsWhileMassiveParticleRuns(page, toggle) {
  const beforeOff = await diagnostics(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const offStart = await diagnostics(page);
  expect(offStart.photonRenderer.markerVisible).toBe(false);
  expect(offStart.photonRenderer.trailVisible).toBe(false);
  await page.waitForTimeout(250);
  const offEnd = await diagnostics(page);
  expect(offEnd.photons.affineParameter).toBeCloseTo(offStart.photons.affineParameter, 12);
  expect(offEnd.photons.integrationPasses).toBe(offStart.photons.integrationPasses);
  expect(offEnd.photons.trajectoryUpdates).toBe(offStart.photons.trajectoryUpdates);
  expect(offEnd.photons.trailUpdates).toBe(offStart.photons.trailUpdates);
  expect(offEnd.photons.diagnosticUpdates).toBe(offStart.photons.diagnosticUpdates);
  expect(offEnd.photons.renderBufferUpdates).toBe(offStart.photons.renderBufferUpdates);
  expect(offEnd.physics.normalizedTime).toBeGreaterThan(beforeOff.physics.normalizedTime);
}

async function selectPhotonWithMouse(page, count) {
  await resetCameraForSmoke(page);
  const visible = await firstVisiblePhoton(page, count);
  expect(visible).not.toBeNull();
  await page.mouse.click(visible.x, visible.y);
  await expect(page.locator(".particle-inspector")).toBeVisible();
  await expect(page.locator(".particle-inspector-kicker")).toHaveText("Photon Inspector");
  expect((await diagnostics(page)).inspector).toMatchObject({ selectedKind: "photon", selectedId: visible.id });
  return visible.id;
}

async function selectPhotonWithTouchEvent(page, count) {
  await resetCameraForSmoke(page);
  const visible = await firstVisiblePhoton(page, count);
  expect(visible).not.toBeNull();
  await page.evaluate(({ x, y }) => {
    const target = document.querySelector("#viewport canvas");
    const originalSetPointerCapture = target.setPointerCapture;
    const originalReleasePointerCapture = target.releasePointerCapture;
    target.setPointerCapture = () => {};
    target.releasePointerCapture = () => {};
    try {
      const init = { bubbles: true, pointerId: 91, pointerType: "touch", isPrimary: true, button: 0, clientX: x, clientY: y };
      target.dispatchEvent(new window.PointerEvent("pointerdown", init));
      target.dispatchEvent(new window.PointerEvent("pointerup", init));
    } finally {
      target.setPointerCapture = originalSetPointerCapture;
      target.releasePointerCapture = originalReleasePointerCapture;
    }
  }, visible);
  await expect(page.locator(".particle-inspector")).toBeVisible();
  expect((await diagnostics(page)).inspector).toMatchObject({ selectedKind: "photon", selectedId: visible.id });
  return visible.id;
}

async function verifyOrbitDrag(page, selectedId) {
  const before = (await diagnostics(page)).camera;
  await page.evaluate(() => {
    const target = document.querySelector("#viewport canvas");
    const rect = target.getBoundingClientRect();
    const startX = rect.left + rect.width * 0.52;
    const startY = rect.top + rect.height * 0.28;
    const originalSetPointerCapture = target.setPointerCapture;
    const originalReleasePointerCapture = target.releasePointerCapture;
    target.setPointerCapture = () => {};
    target.releasePointerCapture = () => {};
    try {
      const base = { bubbles: true, pointerId: 73, pointerType: "mouse", isPrimary: true, button: 0 };
      target.dispatchEvent(new window.PointerEvent("pointerdown", { ...base, buttons: 1, clientX: startX, clientY: startY }));
      for (let step = 1; step <= 6; step += 1) {
        target.dispatchEvent(new window.PointerEvent("pointermove", {
          ...base,
          button: -1,
          buttons: 1,
          clientX: startX - 15 * step,
          clientY: startY + 10 * step,
        }));
      }
      target.dispatchEvent(new window.PointerEvent("pointerup", {
        ...base,
        buttons: 0,
        clientX: startX - 90,
        clientY: startY + 60,
      }));
    } finally {
      target.setPointerCapture = originalSetPointerCapture;
      target.releasePointerCapture = originalReleasePointerCapture;
    }
  });
  await page.waitForTimeout(200);
  const after = await diagnostics(page);
  const cameraDelta = Math.abs(after.camera.x - before.x) + Math.abs(after.camera.y - before.y) + Math.abs(after.camera.z - before.z);
  expect(cameraDelta).toBeGreaterThan(1e-4);
  expect(after.inspector.selectedId).toBe(selectedId);
}

async function runScaleTransitions(page) {
  for (const mode of ["normalized", "physical", "auto-fit-physical", "normalized"]) {
    await page.locator("#scale-mode").selectOption(mode);
    await expect.poll(async () => (await diagnostics(page)).scale.mode).toBe(mode);
  }
}

async function configureNearViewportPhoton(page) {
  const advanced = page.locator(".photon-advanced");
  if (!(await advanced.getAttribute("open"))) await advanced.locator(":scope > summary").click();
  await page.locator(".photon-radius").fill("8");
  await page.locator(".photon-phi").fill("0");
  await page.locator(".photon-impact").fill("3");
  await page.locator(".photon-radial").selectOption("-1");
  await page.locator(".photon-angular").selectOption("1");
  await page.locator(".photon-apply").click();
  await resetCameraForSmoke(page);
  await expect.poll(async () => Boolean(await firstVisiblePhoton(page, 8))).toBe(true);
}

test("Photon Foundation desktop smoke", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".version-chip")).toHaveText("v0.8.0");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const toggle = page.locator(".photon-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect((await diagnostics(page)).photons.enabled).toBe(false);

  await page.locator("#time-scale").selectOption("100");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".photon-count")).toHaveValue("1");
  const enabled = await diagnostics(page);
  expect(enabled.photonRenderer.markerVisible).toBe(true);
  const initialX = enabled.photonRenderer.markerX;
  const initialAffine = enabled.photons.affineParameter;
  await expect.poll(async () => Math.abs((await diagnostics(page)).photonRenderer.markerX - initialX)).toBeGreaterThan(1e-4);
  await expect.poll(async () => (await diagnostics(page)).photons.affineParameter - initialAffine).toBeGreaterThan(1e-4);

  await verifyPhotonStopsWhileMassiveParticleRuns(page, toggle);
  await toggle.click();
  await page.locator(".photon-count").selectOption("8");
  await expect.poll(async () => (await diagnostics(page)).photons.count).toBe(8);

  await page.locator(".photon-setup > summary").click();
  await page.locator(".photon-demo").click();
  await expect.poll(async () => (await diagnostics(page)).photons.preset).toBe("lightBending");
  await expect.poll(async () => (await diagnostics(page)).photonRenderer.trailVertices).toBeGreaterThan(0);
  expect((await diagnostics(page)).photons.count).toBe(8);

  const selectedId = await selectPhotonWithMouse(page, 8);
  await verifyOrbitDrag(page, selectedId);
  await runScaleTransitions(page);
  expect((await diagnostics(page)).inspector.selectedId).toBe(selectedId);

  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".particle-inspector-kicker")).toHaveText("광자 검사기");
  await page.locator("#locale-select").selectOption("en");
  await expect(page.locator(".particle-inspector-kicker")).toHaveText("Photon Inspector");
  expect(errors).toEqual([]);
});

test("Photon Foundation mobile smoke", async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator(".photon-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await page.locator("#open-simulation").click();
  await page.locator("#time-scale").selectOption("100");
  await page.locator("#control-panel [data-close-panel]").click();

  await toggle.click();
  const enabled = await diagnostics(page);
  expect(enabled.photons.count).toBe(1);
  const initialX = enabled.photonRenderer.markerX;
  await expect.poll(async () => Math.abs((await diagnostics(page)).photonRenderer.markerX - initialX)).toBeGreaterThan(1e-4);

  await verifyPhotonStopsWhileMassiveParticleRuns(page, toggle);
  await toggle.click();

  await page.locator("#open-simulation").click();
  await page.locator("#time-scale").selectOption("1");
  await page.locator("#control-panel [data-close-panel]").click();

  await page.locator(".photon-count").selectOption("8");
  await page.locator(".photon-setup > summary").click();
  await configureNearViewportPhoton(page);
  const selectedId = await selectPhotonWithTouchEvent(page, 8);
  await verifyOrbitDrag(page, selectedId);

  await page.locator(".photon-demo").click();
  await expect.poll(async () => (await diagnostics(page)).photons.preset).toBe("lightBending");
  await expect.poll(async () => (await diagnostics(page)).photonRenderer.trailVertices).toBeGreaterThan(0);
  expect((await diagnostics(page)).photons.count).toBe(8);

  await page.locator("#open-visuals").click();
  await runScaleTransitions(page);
  await page.locator("#visual-settings-panel [data-close-panel]").click();

  await page.locator("#locale-select").selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await page.locator("#locale-select").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(errors).toEqual([]);
});
