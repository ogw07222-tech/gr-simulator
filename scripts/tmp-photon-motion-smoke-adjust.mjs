import fs from "node:fs";

const path = "tests/e2e/photon-motion-ui.smoke.spec.js";
let source = fs.readFileSync(path, "utf8");
const from = `  const enabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(enabled.runtime.timeScale).toBe(50);\n  expect(enabled.photons.enabled).toBe(true);\n\n  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(900);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));`;
const to = `  const enabled = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(enabled.runtime.timeScale).toBe(50);\n  expect(enabled.photons.enabled).toBe(true);\n\n  await page.locator(".photon-setup > summary").click();\n  await page.locator(".photon-preset").selectOption("strong");\n  await page.waitForTimeout(100);\n  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  expect(screenBefore).not.toBeNull();\n  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(350);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  expect(screenAfter).not.toBeNull();`;
if (!source.includes(from)) throw new Error("motion smoke patch target missing");
source = source.replace(from, to);
fs.writeFileSync(path, source);
