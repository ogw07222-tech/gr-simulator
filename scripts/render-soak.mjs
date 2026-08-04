import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { chromium } from "@playwright/test";

const durationMinutes = Number(process.env.SOAK_MINUTES ?? 10);
const sampleInterval = Number(process.env.SOAK_INTERVAL_MS ?? 10_000);
const baseUrl = process.env.SOAK_URL ?? "http://127.0.0.1:4173/";
if (!(durationMinutes > 0) || !(sampleInterval > 0)) throw new RangeError("Soak duration and interval must be positive.");

const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(baseUrl);
await page.waitForSelector("#viewport canvas");

const samples = [];
const sampleCount = Math.ceil(durationMinutes * 60_000 / sampleInterval) + 1;
for (let index = 0; index < sampleCount; index += 1) {
  samples.push(await page.evaluate(() => ({
    timestamp: Date.now(),
    fps: Number(document.querySelector("#fps-value")?.textContent) || 0,
    domNodes: document.querySelectorAll("*").length,
    heapBytes: performance.memory?.usedJSHeapSize ?? null,
    diagnostics: window.__GR4D_DIAGNOSTICS__?.getSnapshot() ?? null,
  })));
  if (index < sampleCount - 1) await page.waitForTimeout(sampleInterval);
}

const first = samples[0];
const last = samples.at(-1);
const heapSamples = samples.map((sample) => sample.heapBytes).filter(Number.isFinite);
const result = {
  durationMinutes,
  sampleInterval,
  sampleCount: samples.length,
  errors,
  bounds: {
    domNodeDelta: last.domNodes - first.domNodes,
    heapDeltaBytes: heapSamples.length ? heapSamples.at(-1) - heapSamples[0] : null,
    heapRangeBytes: heapSamples.length ? Math.max(...heapSamples) - Math.min(...heapSamples) : null,
    gridRecomputationDelta: last.diagnostics.grid.recomputations - first.diagnostics.grid.recomputations,
    gridUploadDelta: last.diagnostics.grid.bufferUploads - first.diagnostics.grid.bufferUploads,
    geometryDelta: last.diagnostics.renderer.geometries - first.diagnostics.renderer.geometries,
    textureDelta: last.diagnostics.renderer.textures - first.diagnostics.renderer.textures,
  },
  first,
  last,
  samples,
};

await mkdir("test-results", { recursive: true });
await writeFile("test-results/render-soak.json", JSON.stringify(result, null, 2));
await browser.close();

if (errors.length > 0) throw new Error(`Browser errors during soak: ${errors.join("; ")}`);
if (result.bounds.domNodeDelta !== 0) throw new Error(`DOM node count changed by ${result.bounds.domNodeDelta}.`);
if (result.bounds.gridRecomputationDelta !== 0 || result.bounds.gridUploadDelta !== 0) throw new Error("Stationary grid became dirty during soak.");
if (result.bounds.geometryDelta !== 0 || result.bounds.textureDelta !== 0) throw new Error("Renderer resource counts grew during soak.");
if (result.bounds.heapDeltaBytes !== null && result.bounds.heapDeltaBytes > 32 * 1024 * 1024) throw new Error("JS heap grew beyond the 32 MiB soak allowance.");
process.stdout.write(`${JSON.stringify({ durationMinutes, bounds: result.bounds, first: first.diagnostics, last: last.diagnostics }, null, 2)}\n`);
