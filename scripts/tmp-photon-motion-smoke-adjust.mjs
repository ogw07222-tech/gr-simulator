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
  `  await page.waitForTimeout(900);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));`,
  `  await page.waitForTimeout(250);\n  const screenAfter = await page.evaluate(() => window.__GR4D_DIAGNOSTICS__.getPhotonScreenPosition("photon-0"));`,
  "sample visible motion before photon exits viewport",
);
write(path, source);
