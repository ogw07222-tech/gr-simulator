import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const WORKFLOW_DIRECTORY = resolve(process.cwd(), ".github/workflows");

describe("GitHub Pages deployment policy", () => {
  it("has one Pages publisher and uploads only the Vite dist artifact", () => {
    const workflows = readdirSync(WORKFLOW_DIRECTORY)
      .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
      .map((name) => readFileSync(resolve(WORKFLOW_DIRECTORY, name), "utf8"));
    const publishers = workflows.filter((source) => source.includes("actions/deploy-pages@"));

    expect(publishers).toHaveLength(1);
    expect(publishers[0]).toContain("run: npm ci");
    expect(publishers[0]).toContain("run: npm run build");
    expect(publishers[0]).toMatch(/actions\/upload-pages-artifact@v3[\s\S]*path: \.\/dist/);
    expect(publishers[0]).not.toMatch(/path:\s*['"]?\.['"]?\s*$/m);
  });
});
