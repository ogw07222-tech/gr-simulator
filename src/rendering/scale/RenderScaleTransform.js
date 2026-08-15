import { RENDER_SCALE_MODES, RenderScaleMode, isPhysicalRenderScaleMode } from "./RenderScaleMode.js";

export const DEFAULT_METRES_PER_WORLD_UNIT = 1e9;
export const MIN_METRES_PER_WORLD_UNIT = 1e6;
export const MAX_METRES_PER_WORLD_UNIT = 1e15;

export class RenderScaleTransform {
  constructor({ mode = RenderScaleMode.NORMALIZED, metresPerWorldUnit = DEFAULT_METRES_PER_WORLD_UNIT } = {}) {
    this.mode = RenderScaleMode.NORMALIZED;
    this.metresPerWorldUnit = DEFAULT_METRES_PER_WORLD_UNIT;
    this.schwarzschildRadiusMetres = 1;
    this.scaleFactor = 1;
    this.currentRevision = 0;
    this.setMetresPerWorldUnit(metresPerWorldUnit);
    this.setMode(mode);
  }

  setMode(mode) {
    if (!RENDER_SCALE_MODES.includes(mode)) throw new RangeError("Unsupported render scale mode.");
    if (mode === this.mode) return false;
    this.mode = mode;
    this.#refresh();
    return true;
  }

  setMetresPerWorldUnit(value) {
    if (!Number.isFinite(value) || value < MIN_METRES_PER_WORLD_UNIT || value > MAX_METRES_PER_WORLD_UNIT) {
      throw new RangeError("Physical scale is outside the supported range.");
    }
    if (value === this.metresPerWorldUnit) return false;
    this.metresPerWorldUnit = value;
    this.#refresh();
    return true;
  }

  setSchwarzschildRadiusMetres(value) {
    if (!Number.isFinite(value) || value <= 0 || value === this.schwarzschildRadiusMetres) return false;
    this.schwarzschildRadiusMetres = value;
    this.#refresh();
    return true;
  }

  writeCartesian(target, x, y, z) {
    const factor = this.scaleFactor;
    target.x = Number.isFinite(x) ? x * factor : 0;
    target.y = Number.isFinite(y) ? y * factor : 0;
    target.z = Number.isFinite(z) ? z * factor : 0;
    return target;
  }

  writeArray(target, offset, x, y, z) {
    const factor = this.scaleFactor;
    target[offset] = Number.isFinite(x) ? x * factor : 0;
    target[offset + 1] = Number.isFinite(y) ? y * factor : 0;
    target[offset + 2] = Number.isFinite(z) ? z * factor : 0;
    return target;
  }

  horizonRenderRadius() { return this.scaleFactor; }
  normalizedRadiusToRender(radius) { return Number.isFinite(radius) ? radius * this.scaleFactor : 0; }
  physicalDomainRenderExtent(normalizedExtent) { return this.normalizedRadiusToRender(normalizedExtent); }
  revision() { return this.currentRevision; }
  isPhysical() { return isPhysicalRenderScaleMode(this.mode); }

  #refresh() {
    this.scaleFactor = isPhysicalRenderScaleMode(this.mode)
      ? this.schwarzschildRadiusMetres / this.metresPerWorldUnit
      : 1;
    this.currentRevision += 1;
  }
}
