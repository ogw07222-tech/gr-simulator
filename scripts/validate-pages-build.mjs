import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const DIST_DIRECTORY = resolve("dist");
const INDEX_PATH = resolve(DIST_DIRECTORY, "index.html");
const expectedBase = process.env.GITHUB_PAGES === "true" ? "/gr-simulator/" : "/";

if (!existsSync(INDEX_PATH)) {
  throw new Error("dist/index.html is missing; run the Vite build before validation.");
}

const html = readFileSync(INDEX_PATH, "utf8");
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith("data:") && !url.startsWith("http"));

if (assetUrls.length === 0) {
  throw new Error("The production document does not reference any generated assets.");
}

for (const assetUrl of assetUrls) {
  if (!assetUrl.startsWith(expectedBase)) {
    throw new Error(`Asset URL ${assetUrl} does not use the expected base ${expectedBase}.`);
  }

  const relativePath = assetUrl.slice(expectedBase.length);
  if (!relativePath || !existsSync(resolve(DIST_DIRECTORY, relativePath))) {
    throw new Error(`Referenced production asset is missing: ${assetUrl}`);
  }
}

process.stdout.write(`Validated ${assetUrls.length} production assets under ${expectedBase}.\n`);
