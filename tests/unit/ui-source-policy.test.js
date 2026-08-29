import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { VERSION } from "../../src/core/constants.js";
import { en } from "../../src/ui/i18n/en.js";
import { ko } from "../../src/ui/i18n/ko.js";

const ROOT = process.cwd();

describe("UI source policy", () => {
  it("keeps version sources synchronized", () => {
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    const lock = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf8"));
    const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
    expect(packageJson.version).toBe(VERSION);
    expect(lock.version).toBe(VERSION);
    expect(lock.packages[""].version).toBe(VERSION);
    expect(en.app.title).toContain(VERSION);
    expect(ko.app.title).toContain(VERSION);
    expect(html).toContain(`v${VERSION}`);
  });

  it("does not embed translated prose in UI component templates", () => {
    const files = ["src/ui/AppShell.js", "src/ui/ControlPanel.js", "src/ui/VisualSettingsPanel.js"];
    const allowed = new Set(["GR-4D Simulator", "FPS", "-- ms", "30 FPS", "45 FPS", "60 FPS", "90 FPS", "120 FPS"]);
    files.forEach((file) => {
      const source = readFileSync(resolve(ROOT, file), "utf8");
      const matches = [...source.matchAll(/>([^<>{}]*[A-Za-z가-힣][^<>{}]*)</g)]
        .map((match) => match[1].trim())
        .filter(Boolean);
      expect(matches.filter((value) => !allowed.has(value))).toEqual([]);
    });
  });
});
