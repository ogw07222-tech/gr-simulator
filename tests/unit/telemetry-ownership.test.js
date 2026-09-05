import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("base UI telemetry ownership", () => {
  it("removes selected-particle duplicates while retaining global and unique numerical rows", () => {
    const source = fs.readFileSync("src/ui/ControlPanel.js", "utf8");
    for (const id of [
      "geo-radius", "geo-speed", "geo-coordinate-time", "geo-proper-time",
      "geo-energy", "geo-angular-momentum", "geo-classification", "geo-status",
    ]) expect(source).not.toContain(`id="${id}"`);
    for (const id of [
      "geo-mass", "geo-rs", "geo-energy-drift", "geo-angular-drift",
      "geo-normalization", "geo-substeps",
    ]) expect(source).toContain(`id="${id}"`);
  });
});
