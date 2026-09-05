import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(content, from, to, label) {
  const first = content.indexOf(from);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (content.indexOf(from, first + from.length) >= 0) throw new Error(`Patch target is not unique: ${label}`);
  return content.slice(0, first) + to + content.slice(first + from.length);
}

const path = "tests/e2e/photon-motion-ui.smoke.spec.js";
let source = read(path);
source = replaceOnce(
  source,
  `async function clickProjected(page, position) {\n  const canvas = page.locator("#viewport canvas");\n  const box = await canvas.boundingBox();\n  if (!box || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error("Projected object is unavailable");\n  await page.mouse.click(box.x + position.x, box.y + position.y);\n}\n`,
  `async function clickProjected(page, position) {\n  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error("Projected object is unavailable");\n  await page.mouse.click(position.x, position.y);\n}\n`,
  "use inspector screen coordinates directly",
);
source = replaceOnce(
  source,
  `  const screenBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  await page.waitForTimeout(900);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));\n  const stateAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(stateAfter.photons.affineParameter).toBeGreaterThan(stateBefore.photons.affineParameter);\n  expect(Math.hypot(\n    stateAfter.photonRenderer.markerX - stateBefore.photonRenderer.markerX,\n    stateAfter.photonRenderer.markerY - stateBefore.photonRenderer.markerY,\n    stateAfter.photonRenderer.markerZ - stateBefore.photonRenderer.markerZ,\n  )).toBeGreaterThan(0.2);\n  expect(Math.hypot(screenAfter.x - screenBefore.x, screenAfter.y - screenBefore.y)).toBeGreaterThan(1);`,
  `  const stateBefore = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  const visibleSamples = await page.evaluate(async () => {\n    const samples = [];\n    const started = window.performance.now();\n    await new Promise((resolve) => {\n      const sample = () => {\n        const position = window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0");\n        if (position) samples.push([position.x, position.y]);\n        if (window.performance.now() - started >= 250) resolve();\n        else window.requestAnimationFrame(sample);\n      };\n      window.requestAnimationFrame(sample);\n    });\n    return samples;\n  });\n  const stateAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getSnapshot());\n  expect(stateAfter.photons.affineParameter).toBeGreaterThan(stateBefore.photons.affineParameter);\n  expect(Math.hypot(\n    stateAfter.photonRenderer.markerX - stateBefore.photonRenderer.markerX,\n    stateAfter.photonRenderer.markerY - stateBefore.photonRenderer.markerY,\n    stateAfter.photonRenderer.markerZ - stateBefore.photonRenderer.markerZ,\n  )).toBeGreaterThan(0.2);\n  expect(visibleSamples.length).toBeGreaterThan(1);\n  const [firstX, firstY] = visibleSamples[0];\n  const maxVisibleTravel = Math.max(...visibleSamples.map(([x, y]) => Math.hypot(x - firstX, y - firstY)));\n  expect(maxVisibleTravel).toBeGreaterThan(1);`,
  "sample visible motion before the photon can leave the viewport",
);
write(path, source);
