import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const ROOT = process.cwd();
const OUTPUT = "PROJECT_STATS.md";
const EXCLUDED_DIRECTORIES = new Set([
  ".git", "node_modules", "dist", "coverage", "test-results", ".cache", ".vite",
]);
const EXCLUDED_PARTS = new Set(["screenshots", "videos", "traces"]);
const TEXT_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".css", ".html", ".md", ".json", ".yml", ".yaml"]);
const LANGUAGE_NAMES = new Map([
  [".js", "JavaScript"], [".mjs", "JavaScript"], [".cjs", "JavaScript"],
  [".css", "CSS"], [".html", "HTML"], [".md", "Markdown"],
  [".json", "JSON"], [".yml", "YAML"], [".yaml", "YAML"],
]);

const files = [];

function normalized(path) { return path.split(sep).join("/"); }
function format(value) { return Number.isFinite(value) ? value.toLocaleString("en-US") : "Unavailable"; }
function escapeCell(value) { return String(value).replaceAll("|", "\\|"); }
function table(headers, rows) {
  const align = headers.map((_, index) => index === 0 ? "---" : "---:");
  return [headers, align, ...rows].map((row) => `| ${row.map(escapeCell).join(" | ")} |`).join("\n");
}

function lineCounts(text) {
  if (text.length === 0) return { physical: 0, nonEmpty: 0 };
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return { physical: lines.length, nonEmpty: lines.filter((line) => line.trim().length > 0).length };
}

function isTemporary(name) {
  return name.endsWith("~") || name.endsWith(".tmp") || name.endsWith(".temp") || name.endsWith(".log");
}

async function scan(directory = ROOT) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    const path = normalized(relative(ROOT, absolute));
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name) || path.split("/").some((part) => EXCLUDED_PARTS.has(part))) continue;
      await scan(absolute);
      continue;
    }
    if (!entry.isFile() || entry.name === ".git" || isTemporary(entry.name)) continue;
    const extension = extname(entry.name).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension) && entry.name !== "LICENSE") continue;
    const counts = entry.name === "package-lock.json" ? { physical: 0, nonEmpty: 0 } : lineCounts(await readFile(absolute, "utf8"));
    files.push({ path, extension, ...counts });
  }
}

function sum(records) {
  return records.reduce((total, file) => ({
    files: total.files + 1,
    physical: total.physical + file.physical,
    nonEmpty: total.nonEmpty + file.nonEmpty,
  }), { files: 0, physical: 0, nonEmpty: 0 });
}

function git(...args) {
  try {
    return execFileSync("git", ["-c", `safe.directory=${ROOT}`, ...args], {
      cwd: ROOT, encoding: "utf8", timeout: 2_000, maxBuffer: 2 * 1024 * 1024,
    }).trim();
  } catch { return ""; }
}

async function buildStatistics() {
  const distPath = join(ROOT, "dist");
  try {
    if (!(await stat(distPath)).isDirectory()) throw new Error("not a directory");
  } catch {
    return null;
  }

  const result = { total: 0, js: 0, css: 0, other: 0, gzipJs: 0, gzipCss: 0, largest: null };
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) { await visit(absolute); continue; }
      if (!entry.isFile()) continue;
      const data = await readFile(absolute);
      const path = normalized(relative(distPath, absolute));
      const extension = extname(entry.name).toLowerCase();
      result.total += data.byteLength;
      if (extension === ".js") { result.js += data.byteLength; result.gzipJs += gzipSync(data).byteLength; }
      else if (extension === ".css") { result.css += data.byteLength; result.gzipCss += gzipSync(data).byteLength; }
      else result.other += data.byteLength;
      if (!result.largest || data.byteLength > result.largest.bytes) result.largest = { path, bytes: data.byteLength };
    }
  }
  await visit(distPath);
  return result;
}

function bytes(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(2)} KiB`;
}

await scan();
const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const source = files.filter((file) => file.path.startsWith("src/"));
const tests = files.filter((file) => file.path.startsWith("tests/"));
const documentation = files.filter((file) => file.extension === ".md"
  && file.path !== OUTPUT && (!file.path.includes("/") || file.path.startsWith("docs/")));
const categorized = new Set([...source, ...tests, ...documentation]);
const tooling = files.filter((file) => !categorized.has(file) && file.path !== "package-lock.json");
const sourceTotals = sum(source);
const testTotals = sum(tests);
const documentationTotals = sum(documentation);
const toolingTotals = sum(tooling);

const modules = new Map();
for (const file of source) {
  const parts = file.path.split("/");
  const module = parts.length > 2 ? parts[1] : "(root)";
  if (!modules.has(module)) modules.set(module, []);
  modules.get(module).push(file);
}

const languages = new Map();
for (const file of files) {
  if (file.path === "package-lock.json") continue;
  const language = LANGUAGE_NAMES.get(file.extension) ?? "Other text";
  if (!languages.has(language)) languages.set(language, []);
  languages.get(language).push(file);
}

const rootDocuments = documentation.filter((file) => !file.path.includes("/"));
const docsDocuments = documentation.filter((file) => file.path.startsWith("docs/"));
const physicsTests = tests.filter((file) => file.path.startsWith("tests/physics/"));
const e2eTests = tests.filter((file) => file.path.startsWith("tests/e2e/"));
const unitTests = tests.filter((file) => !physicsTests.includes(file) && !e2eTests.includes(file));
const branch = git("branch", "--show-current") || "Unavailable";
const commit = git("rev-parse", "--short", "HEAD") || "Unavailable";
const commitCount = Number(git("rev-list", "--count", "HEAD"));
const trackedFiles = git("ls-files").split(/\r?\n/).filter(Boolean).length || Number.NaN;
const contributorCount = new Set(git("log", "--format=%aN <%aE>").split(/\r?\n/).filter(Boolean)).size || Number.NaN;
const build = await buildStatistics();

const output = `# GR-4D Simulator — Project Statistics

> Automatically generated by \`npm run stats\`.
> Do not edit calculated values manually.

## Overview

${table(["Metric", "Value"], [
  ["Version", `v${packageJson.version}`],
  ["Scanned text files", format(files.length)],
  ["Source files", format(sourceTotals.files)],
  ["Source physical LOC", format(sourceTotals.physical)],
  ["Source non-empty LOC", format(sourceTotals.nonEmpty)],
  ["Test files", format(testTotals.files)],
  ["Test physical LOC", format(testTotals.physical)],
  ["Documentation files", format(documentationTotals.files)],
  ["Documentation physical LOC", format(documentationTotals.physical)],
  ["Configuration/tooling physical LOC", format(toolingTotals.physical)],
  ["Git commits", format(commitCount)],
])}

## Source by Module

${table(["Module", "Files", "Physical LOC", "Non-empty LOC"], [...modules.entries()]
  .sort(([a], [b]) => a.localeCompare(b, "en"))
  .map(([module, records]) => { const totals = sum(records); return [module, format(totals.files), format(totals.physical), format(totals.nonEmpty)]; }))}

## Languages

${table(["Language", "Files", "Physical LOC", "Non-empty LOC"], [...languages.entries()]
  .sort(([a], [b]) => a.localeCompare(b, "en"))
  .map(([language, records]) => { const totals = sum(records); return [language, format(totals.files), format(totals.physical), format(totals.nonEmpty)]; }))}

## Testing

${table(["Test category", "Files", "Physical LOC", "Non-empty LOC"], [
  ["Unit / integration", ...Object.values(sum(unitTests)).map(format)],
  ["Physics", ...Object.values(sum(physicsTests)).map(format)],
  ["Playwright / e2e", ...Object.values(sum(e2eTests)).map(format)],
  ["Total", ...Object.values(testTotals).map(format)],
])}

The report counts discovered test source files, not test cases. It does not run Vitest, Playwright, or scientific simulations.

## Documentation

${table(["Location", "Files", "Physical LOC", "Non-empty LOC"], [
  ["Root Markdown", ...Object.values(sum(rootDocuments)).map(format)],
  ["docs/", ...Object.values(sum(docsDocuments)).map(format)],
  ["Total", ...Object.values(documentationTotals).map(format)],
])}

Major documents: ${documentation.map((file) => `\`${file.path}\``).sort((a, b) => a.localeCompare(b, "en")).join(", ")}.

## Production Build

${build ? table(["Metric", "Value"], [
  ["Total dist size", bytes(build.total)],
  ["JavaScript assets", bytes(build.js)],
  ["JavaScript gzip", bytes(build.gzipJs)],
  ["CSS assets", bytes(build.css)],
  ["CSS gzip", bytes(build.gzipCss)],
  ["Other assets", bytes(build.other)],
  ["Largest asset", `${build.largest?.path ?? "Unavailable"} (${bytes(build.largest?.bytes)})`],
]) : "Production build statistics unavailable — run `npm run build` first."}

\`npm run stats\` reads an existing \`dist/\` directory but never starts a production build.

## Repository

${table(["Metric", "Value"], [
  ["Current branch", branch],
  ["Current commit", commit],
  ["Tracked files", format(trackedFiles)],
  ["Commit count", format(commitCount)],
  ["Commit-author identities", format(contributorCount)],
])}

No network or GitHub API access is used. Git fields are shown as unavailable when local metadata cannot be read within the bounded command limits.

## About These Numbers

- LOC is a repository size metric, not a code-quality or complexity score.
- Physical LOC counts lines containing text or whitespace; non-empty LOC excludes blank lines.
- Generated, vendor, cache, temporary, binary, Playwright artifact, and lock-file contents are excluded from LOC.
- \`PROJECT_STATS.md\` is excluded from documentation LOC so generation does not change its own totals.
- Build statistics require an existing \`dist/\` directory and may describe the most recent local build.
- Statistics represent the working tree measured at the displayed local commit.

Generated from commit: ${commit}
`;

await writeFile(join(ROOT, OUTPUT), output, "utf8");
process.stdout.write(`Generated ${OUTPUT} from ${files.length} scanned text files.\n`);
