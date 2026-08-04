import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { chromium } from "@playwright/test";

const url = process.env.BENCHMARK_URL ?? "http://127.0.0.1:4173/";
const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(url);
await page.waitForSelector("#viewport canvas");

async function measure(name) {
  await page.waitForTimeout(750);
  const fps = [];
  for (let index = 0; index < 12; index += 1) {
    fps.push(Number(await page.locator("#fps-value").textContent()) || 0);
    await page.waitForTimeout(250);
  }
  const valid = fps.filter((value) => value > 0).sort((a, b) => a - b);
  return page.evaluate(({ scenario, averageFps, lowFps }) => ({
    scenario,
    averageFps,
    lowFps,
    domNodes: document.querySelectorAll("*").length,
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
    diagnostics: window.__GR4D_DIAGNOSTICS__.getSnapshot(),
  }), {
    scenario: name,
    averageFps: valid.reduce((sum, value) => sum + value, 0) / valid.length,
    lowFps: valid[Math.floor(valid.length * 0.1)] ?? 0,
  });
}

const results = [];
results.push(await measure("desktop-default-60"));
await page.locator("#max-fps").selectOption("30");
results.push(await measure("desktop-cap-30"));
await page.locator("#max-fps").selectOption("60");
results.push(await measure("desktop-cap-60"));
await page.locator("#max-fps").selectOption("0");
results.push(await measure("desktop-unlimited"));

const canvas = await page.locator("#viewport canvas").boundingBox();
await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
await page.mouse.wheel(0, -1600);
results.push(await measure("desktop-near-body"));
await page.getByRole("button", { name: "Reset Camera" }).click();
await page.mouse.wheel(0, 2600);
results.push(await measure("desktop-far-grid"));

await page.setViewportSize({ width: 390, height: 844 });
results.push(await measure("mobile-390x844"));
await mkdir("test-results", { recursive: true });
await writeFile("test-results/render-benchmark.json", JSON.stringify({ url, errors, results }, null, 2));
await browser.close();
if (errors.length) throw new Error(errors.join("; "));
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
