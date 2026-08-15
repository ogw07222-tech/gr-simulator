export const DisplayUnitMode = Object.freeze({ AUTOMATIC: "automatic", SI: "si", ASTRONOMICAL: "astronomical" });
export const DISPLAY_UNIT_MODES = Object.freeze(Object.values(DisplayUnitMode));
export const DISPLAY_UNITS_STORAGE_KEY = "gr4d.displayUnits";

export const SCIENTIFIC_UNITS = Object.freeze({
  astronomicalUnit: 149597870700,
  lightYear: 9460730472580800,
  parsec: 3.085677581491367e16,
  speedOfLight: 299792458,
  earthMass: 5.9722e24,
  solarMass: 1.98847e30,
  year: 31557600,
});

const PREFIXES = Object.freeze([[1e18, "EJ"], [1e15, "PJ"], [1e12, "TJ"], [1e9, "GJ"], [1e6, "MJ"], [1e3, "kJ"]]);
const CACHE_LIMIT = 512;

function restoredMode() {
  try {
    const value = globalThis.localStorage?.getItem(DISPLAY_UNITS_STORAGE_KEY);
    return DISPLAY_UNIT_MODES.includes(value) ? value : DisplayUnitMode.AUTOMATIC;
  } catch { return DisplayUnitMode.AUTOMATIC; }
}

export class UnitFormatter {
  constructor({ mode = restoredMode(), locale = () => "en" } = {}) {
    this.mode = DISPLAY_UNIT_MODES.includes(mode) ? mode : DisplayUnitMode.AUTOMATIC;
    this.locale = locale;
    this.cache = new Map();
    this.numberFormats = new Map();
    this.listeners = new Set();
  }

  getMode() { return this.mode; }

  setMode(mode) {
    if (!DISPLAY_UNIT_MODES.includes(mode)) throw new RangeError(`Unsupported display unit mode: ${mode}`);
    if (mode === this.mode) return mode;
    this.mode = mode;
    this.cache.clear();
    try { globalThis.localStorage?.setItem(DISPLAY_UNITS_STORAGE_KEY, mode); } catch { /* storage is optional */ }
    this.listeners.forEach((listener) => listener(mode));
    return mode;
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  formatDistance(value) {
    return this.#cached("distance", value, () => {
      const magnitude = Math.abs(value);
      if (this.mode === DisplayUnitMode.SI) return this.#unit(value, "m");
      if (this.mode === DisplayUnitMode.ASTRONOMICAL) return this.#unit(value / SCIENTIFIC_UNITS.astronomicalUnit, "AU");
      if (magnitude < 1e3) return this.#unit(value, "m");
      if (magnitude < 1e6) return this.#unit(value / 1e3, "km");
      if (magnitude < 1e9) return this.#unit(value / 1e6, "×10³ km");
      if (magnitude < SCIENTIFIC_UNITS.astronomicalUnit * 0.1) return this.#unit(value / 1e9, "×10⁶ km");
      if (magnitude < SCIENTIFIC_UNITS.lightYear * 0.1) return this.#unit(value / SCIENTIFIC_UNITS.astronomicalUnit, "AU");
      if (magnitude < SCIENTIFIC_UNITS.parsec) return this.#unit(value / SCIENTIFIC_UNITS.lightYear, "ly");
      return this.#unit(value / SCIENTIFIC_UNITS.parsec, "pc");
    });
  }

  formatVelocity(value) {
    return this.#cached("velocity", value, () => {
      if (this.mode === DisplayUnitMode.ASTRONOMICAL) return this.#unit(value / SCIENTIFIC_UNITS.speedOfLight, "c");
      if (this.mode === DisplayUnitMode.SI || Math.abs(value) < 1e3) return this.#unit(value, "m/s");
      if (Math.abs(value) >= SCIENTIFIC_UNITS.speedOfLight * 0.01) return this.#unit(value / SCIENTIFIC_UNITS.speedOfLight, "c");
      return this.#unit(value / 1e3, "km/s");
    });
  }

  formatMass(value) {
    return this.#cached("mass", value, () => {
      if (this.mode === DisplayUnitMode.ASTRONOMICAL) return this.#unit(value / SCIENTIFIC_UNITS.solarMass, "M☉");
      if (this.mode === DisplayUnitMode.SI || Math.abs(value) < SCIENTIFIC_UNITS.earthMass * 0.01) return this.#unit(value, "kg");
      if (Math.abs(value) >= SCIENTIFIC_UNITS.solarMass * 0.01) return this.#unit(value / SCIENTIFIC_UNITS.solarMass, "M☉");
      return this.#unit(value / SCIENTIFIC_UNITS.earthMass, "M⊕");
    });
  }

  formatEnergy(value) {
    return this.#cached("energy", value, () => {
      if (this.mode === DisplayUnitMode.SI) return this.#unit(value, "J");
      const prefix = PREFIXES.find(([threshold]) => Math.abs(value) >= threshold);
      return prefix ? this.#unit(value / prefix[0], prefix[1]) : this.#unit(value, "J");
    });
  }

  formatTime(value) {
    return this.#cached("time", value, () => {
      const magnitude = Math.abs(value);
      if (this.mode === DisplayUnitMode.ASTRONOMICAL) return this.#unit(value / SCIENTIFIC_UNITS.year, "yr");
      if (this.mode === DisplayUnitMode.SI || magnitude < 60) return this.#unit(value, "s");
      if (magnitude >= SCIENTIFIC_UNITS.year) return this.#unit(value / SCIENTIFIC_UNITS.year, "yr");
      if (magnitude < 3600) return this.#unit(value / 60, "min");
      if (magnitude < 86400) return this.#unit(value / 3600, "h");
      if (magnitude < SCIENTIFIC_UNITS.year) return this.#unit(value / 86400, "d");
      return this.#unit(value / SCIENTIFIC_UNITS.year, "yr");
    });
  }

  #cached(type, value, create) {
    if (!Number.isFinite(value)) return "—";
    const key = `${type}|${this.mode}|${this.locale()}|${value}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const result = create();
    if (this.cache.size >= CACHE_LIMIT) this.cache.clear();
    this.cache.set(key, result);
    return result;
  }

  #unit(value, unit) { return `${this.#number(value)} ${unit}`; }

  #number(value) {
    const locale = this.locale() === "ko" ? "ko-KR" : "en-US";
    const magnitude = Math.abs(value);
    const digits = magnitude !== 0 && (magnitude >= 1e9 || magnitude < 1e-3) ? 4 : 3;
    const notation = magnitude >= 1e9 || (magnitude > 0 && magnitude < 1e-3) ? "scientific" : "standard";
    const key = `${locale}|${digits}|${notation}`;
    if (!this.numberFormats.has(key)) this.numberFormats.set(key, new Intl.NumberFormat(locale, {
      maximumSignificantDigits: digits + 1, maximumFractionDigits: 6, notation,
    }));
    return this.numberFormats.get(key).format(value);
  }
}
