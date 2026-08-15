import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DisplayUnitMode, DISPLAY_UNITS_STORAGE_KEY, SCIENTIFIC_UNITS, UnitFormatter,
} from "../../src/ui/units/index.js";

describe("UnitFormatter", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("selects automatic distance units at scientific boundaries", () => {
    const formatter = new UnitFormatter();
    expect(formatter.formatDistance(999)).toContain("m");
    expect(formatter.formatDistance(1000)).toContain("km");
    expect(formatter.formatDistance(1e6)).toContain("×10³ km");
    expect(formatter.formatDistance(1e9)).toContain("×10⁶ km");
    expect(formatter.formatDistance(SCIENTIFIC_UNITS.astronomicalUnit)).toContain("AU");
    expect(formatter.formatDistance(SCIENTIFIC_UNITS.lightYear)).toContain("ly");
    expect(formatter.formatDistance(SCIENTIFIC_UNITS.parsec)).toContain("pc");
  });

  it("formats velocity, mass, energy, and time adaptively", () => {
    const formatter = new UnitFormatter();
    expect(formatter.formatVelocity(500)).toContain("m/s");
    expect(formatter.formatVelocity(5000)).toContain("km/s");
    expect(formatter.formatVelocity(SCIENTIFIC_UNITS.speedOfLight)).toContain("c");
    expect(formatter.formatMass(SCIENTIFIC_UNITS.earthMass)).toContain("M⊕");
    expect(formatter.formatMass(SCIENTIFIC_UNITS.solarMass)).toContain("M☉");
    expect(formatter.formatEnergy(1e9)).toContain("GJ");
    expect(formatter.formatTime(60)).toContain("min");
    expect(formatter.formatTime(3600)).toContain("h");
    expect(formatter.formatTime(86400)).toContain("d");
    expect(formatter.formatTime(SCIENTIFIC_UNITS.year)).toContain("yr");
  });

  it("supports SI and astronomical display policies without changing input values", () => {
    const formatter = new UnitFormatter({ mode: DisplayUnitMode.SI });
    expect(formatter.formatDistance(SCIENTIFIC_UNITS.astronomicalUnit)).toContain("m");
    expect(formatter.formatMass(SCIENTIFIC_UNITS.solarMass)).toContain("kg");
    formatter.setMode(DisplayUnitMode.ASTRONOMICAL);
    expect(formatter.formatDistance(1)).toContain("AU");
    expect(formatter.formatVelocity(1)).toContain("c");
    expect(formatter.formatMass(1)).toContain("M☉");
    expect(formatter.formatTime(1)).toContain("yr");
  });

  it("persists mode, notifies subscribers, caches results, and rejects invalid modes", () => {
    const formatter = new UnitFormatter();
    const listener = vi.fn();
    const unsubscribe = formatter.subscribe(listener);
    const first = formatter.formatDistance(42);
    expect(formatter.formatDistance(42)).toBe(first);
    formatter.setMode(DisplayUnitMode.SI);
    expect(globalThis.localStorage.getItem(DISPLAY_UNITS_STORAGE_KEY)).toBe(DisplayUnitMode.SI);
    expect(listener).toHaveBeenCalledWith(DisplayUnitMode.SI);
    unsubscribe();
    expect(() => formatter.setMode("invalid")).toThrow(RangeError);
    expect(formatter.formatDistance(Number.NaN)).toBe("—");
  });
});
