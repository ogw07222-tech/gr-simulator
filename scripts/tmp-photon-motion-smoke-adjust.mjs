import fs from "node:fs";

const path = "tests/e2e/photon-motion-ui.smoke.spec.js";
let source = fs.readFileSync(path, "utf8");

const helperFrom = `async function clickProjected(page, position) {\n  const canvas = page.locator("#viewport canvas");\n  const box = await canvas.boundingBox();\n  if (!box || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error("Projected object is unavailable");\n  await page.mouse.click(box.x + position.x, box.y + position.y);\n}`;
const helperTo = `async function clickProjected(page, position) {\n  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error("Projected object is unavailable");\n  await page.mouse.click(position.x, position.y);\n}`;
if (!source.includes(helperFrom)) throw new Error("projected-click helper target missing");
source = source.replace(helperFrom, helperTo);

const from = `  const enabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(enabled.runtime.timeScale).toBe(50);\n  expect(enabled.photons.enabled).toBe(true);\n\n  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(900);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));`;
const to = `  const enabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(enabled.runtime.timeScale).toBe(50);\n  expect(enabled.photons.enabled).toBe(true);\n\n  await page.locator(".photon-setup > summary").click();\n  await page.locator(".photon-advanced > summary").click();\n  await page.locator(".photon-radius").fill("8");\n  await page.locator(".photon-phi").fill(String(Math.PI));\n  await page.locator(".photon-impact").fill("3");\n  await page.locator(".photon-radial").selectOption("-1");\n  await page.locator(".photon-angular").selectOption("1");\n  await page.locator(".photon-apply").click();\n  await page.waitForTimeout(100);\n  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  expect(screenBefore).not.toBeNull();\n  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(350);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  expect(screenAfter).not.toBeNull();`;
if (!source.includes(from)) throw new Error("motion smoke patch target missing");
source = source.replace(from, to);
fs.writeFileSync(path, source);
