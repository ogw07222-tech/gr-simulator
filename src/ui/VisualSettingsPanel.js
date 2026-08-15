import { subscribeLocale, t } from "./i18n.js";
import { DEFAULT_METRES_PER_WORLD_UNIT, RenderScaleMode } from "../rendering/index.js";
import { helpButton } from "./ScientificHelp.js";

const SCALE_STORAGE_KEY = "gr4d.renderScale";

const DEFAULTS = Object.freeze({
  particleSize: 0.36,
  particleOpacity: 1,
  particleBrightness: 1,
  trailVisible: true,
  trailOpacity: 0.88,
  trailBrightness: 1,
  trailFade: 0.82,
  trailColorMode: "speed",
  trailSpeedMaximum: 2,
  gridVisible: true,
  gridOpacity: 0.52,
  gridBrightness: 0.82,
  maxFps: 60,
  horizonGlow: 0.42,
  massBrightness: 1,
  scaleMode: RenderScaleMode.NORMALIZED,
  metresPerWorldUnit: DEFAULT_METRES_PER_WORLD_UNIT,
  showScaleIndicator: true,
  showNormalizedGridPhysical: true,
});

export class VisualSettingsPanel {
  constructor(root, {
    particleRenderer, grid, massObject, frameRateController = null, trailCapacity = null,
    scaleTransform = null, fitPhysicalScene = () => {}, scaleIndicator = null,
    onScaleChange = () => {}, unitFormatter = null,
  }) {
    this.root = root;
    this.particleRenderer = particleRenderer;
    this.grid = grid;
    this.massObject = massObject;
    this.frameRateController = frameRateController ?? { maxFps: 60, setMaxFps() {} };
    this.scaleTransform = scaleTransform;
    this.fitPhysicalScene = fitPhysicalScene;
    this.scaleIndicator = scaleIndicator;
    this.onScaleChange = onScaleChange;
    this.unitFormatter = unitFormatter;
    this.trailCapacity = trailCapacity ?? {
      current: particleRenderer.maxTrailLength,
      options: [particleRenderer.maxTrailLength],
      resize: () => false,
    };
    this.values = { ...DEFAULTS };
    this.#restoreScaleSettings();
    this.values.maxFps = this.frameRateController.maxFps;
    this.render();
    this.bind();
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
    this.unsubscribeUnits = unitFormatter?.subscribe(() => { this.sync(); this.onScaleChange(); });
    this.localize();
    this.apply();
  }

  renderRange(id, label, min, max, step) {
    return `<label class="visual-control" for="${id}"><span data-i18n="${label}"></span><output data-output="${id}"></output>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" /></label>`;
  }

  render() {
    this.root.innerHTML = `
      <div class="panel-heading"><div><span class="section-index">02</span><h2 data-i18n="panels.visualSettings"></h2></div><button class="panel-close" data-close-panel type="button" data-i18n="panels.close" data-i18n-aria="panels.closeVisuals"></button></div>
      <p class="panel-intro" data-i18n="visual.intro"></p>
      ${this.unitFormatter ? `<details class="panel-section control-disclosure" open><summary><span data-i18n="displayUnits.section"></span></summary><div class="disclosure-body">
        <label class="select-control" for="display-unit-mode"><span data-i18n="displayUnits.mode"></span><select id="display-unit-mode" data-i18n-aria="displayUnits.mode">
          <option value="automatic" data-i18n="displayUnits.automatic"></option><option value="si" data-i18n="displayUnits.si"></option><option value="astronomical" data-i18n="displayUnits.astronomical"></option>
        </select></label><p class="control-description" data-i18n="displayUnits.note"></p>
      </div></details>` : ""}
      ${this.scaleTransform ? `<details class="panel-section control-disclosure" open><summary><span data-i18n="scale.section"></span></summary><div class="disclosure-body">
        <label class="select-control" for="scale-mode"><span><span data-i18n="scale.viewMode"></span>${helpButton("normalizedCoordinates")}</span><select id="scale-mode">
          <option value="normalized" data-i18n="scale.mode.normalized"></option>
          <option value="physical" data-i18n="scale.mode.physical"></option>
          <option value="auto-fit-physical" data-i18n="scale.mode.auto-fit-physical"></option>
        </select></label>
        <label class="numeric-control" for="physical-scale"><span><span data-i18n="scale.metresPerWorldUnit"></span>${helpButton("metresPerWorldUnit")}</span><input id="physical-scale" type="number" min="1000000" max="1000000000000000" step="1000000" /></label>
        <output id="physical-scale-readable" class="derived-value"></output>
        <div class="scale-actions"><button id="scale-decrease" type="button" data-i18n="scale.decrease"></button><button id="scale-increase" type="button" data-i18n="scale.increase"></button><button id="fit-physical-scene" type="button" data-i18n="scale.fit"></button></div>
        <label class="switch scale-switch"><input id="show-scale-indicator" type="checkbox" /><span data-i18n="scale.showIndicator"></span></label>
        <label class="switch scale-switch"><input id="show-normalized-grid-physical" type="checkbox" /><span data-i18n="scale.showGridPhysical"></span></label>
        <p class="scientific-note"><span data-i18n="scale.gridDisclaimer"></span>${helpButton("gridPhysicalScale")}</p>
        <button id="reset-scale" class="secondary-action" type="button" data-i18n="scale.reset"></button>
      </div></details>` : ""}
      <details class="panel-section control-disclosure" open><summary><span data-i18n="visual.performance"></span></summary><div class="disclosure-body">
        <label class="select-control" for="max-fps"><span data-i18n="visual.maximumFps"></span><select id="max-fps">
          <option value="30">30 FPS</option><option value="45">45 FPS</option><option value="60">60 FPS</option><option value="90">90 FPS</option><option value="120">120 FPS</option><option value="0" data-i18n="visual.unlimited"></option>
        </select></label>
        <p class="control-description" data-i18n="visual.fpsNote"></p>
      </div></details>
      <details class="panel-section control-disclosure" open><summary><span data-i18n="visual.particle"></span></summary><div class="disclosure-body">
        ${this.renderRange("particle-size", "visual.particleSize", 0.18, 0.72, 0.02)}
        ${this.renderRange("particle-brightness", "visual.brightness", 0.5, 1.5, 0.05)}
        ${this.renderRange("particle-opacity", "visual.opacity", 0.2, 1, 0.05)}
      </div></details>
      <details class="panel-section control-disclosure" open><summary><span data-i18n="visual.trail"></span></summary><div class="disclosure-body"><div class="section-title-row"><span></span><label class="switch"><input id="trail-visible" type="checkbox" /><span data-i18n="visual.visible"></span></label></div>
        ${this.renderRange("trail-opacity", "visual.opacity", 0.1, 1, 0.05)}
        ${this.renderRange("trail-brightness", "visual.brightness", 0.4, 1.5, 0.05)}
        ${this.renderRange("trail-fade", "visual.ageFade", 0, 1, 0.05)}
        <p class="control-description" data-i18n="visual.trailSpeedDescription"></p>
        <div class="scientific-legend" aria-live="polite">
          <div class="legend-heading"><strong data-i18n="legend.speedTitle"></strong><small data-i18n="legend.speedUnit"></small></div>
          <div class="legend-gradient speed-gradient" aria-hidden="true"></div>
          <div class="legend-values"><span id="speed-legend-min"></span><span id="speed-legend-mid"></span><span id="speed-legend-max"></span></div>
        </div>
        <label class="select-control" for="trail-capacity"><span data-i18n="visual.trailCapacity"></span><select id="trail-capacity">
          ${this.trailCapacity.options.map((capacity) => `<option value="${capacity}" data-capacity="${capacity}"></option>`).join("")}
        </select></label>
        <p class="control-description" data-i18n="visual.trailCapacityNote"></p>
      </div></details>
      <details class="panel-section control-disclosure" open><summary><span data-i18n="visual.spacetimeGrid"></span></summary><div class="disclosure-body"><div class="section-title-row"><span></span><label class="switch"><input id="grid-visible" type="checkbox" /><span data-i18n="visual.visible"></span></label></div>
        ${this.renderRange("grid-opacity", "visual.opacity", 0.08, 0.9, 0.02)}
        ${this.renderRange("grid-brightness", "visual.brightness", 0.3, 1.2, 0.05)}
        <div class="scientific-legend" aria-live="polite">
          <div class="legend-heading"><strong data-i18n="legend.gridTitle"></strong><small data-i18n="legend.gridUnit"></small></div>
          <div class="legend-gradient grid-gradient" aria-hidden="true"></div>
          <div class="legend-values"><span id="grid-legend-min"></span><span id="grid-legend-mid"></span><span id="grid-legend-max"></span></div>
          <p data-i18n="legend.gridScale"></p>
        </div>
      </div></details>
      <details class="panel-section control-disclosure"><summary><span data-i18n="visual.massRendering"></span></summary><div class="disclosure-body">
        ${this.renderRange("horizon-glow", "visual.horizonIntensity", 0.08, 0.8, 0.02)}
        ${this.renderRange("mass-brightness", "visual.coreEmissive", 0.5, 3, 0.1)}
      </div></details>
      <button id="reset-visuals" class="secondary-action" type="button" data-i18n="visual.reset"></button>
    `;
  }

  localize() {
    this.root.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
    this.root.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
    });
    this.root.setAttribute("aria-label", t("panels.visualSettings"));
    this.root.querySelectorAll("[data-capacity]").forEach((option) => {
      option.textContent = t("visual.trailCapacitySamples", { value: option.dataset.capacity });
    });
    this.updateLegends();
    if (this.scaleTransform) this.sync();
  }

  bind() {
    this.root.querySelector("#display-unit-mode")?.addEventListener("change", (event) => this.unitFormatter.setMode(event.target.value));
    const bindings = [
      ["particle-size", "particleSize"], ["particle-brightness", "particleBrightness"],
      ["particle-opacity", "particleOpacity"], ["trail-opacity", "trailOpacity"],
      ["trail-brightness", "trailBrightness"], ["trail-fade", "trailFade"],
      ["grid-opacity", "gridOpacity"], ["grid-brightness", "gridBrightness"],
      ["horizon-glow", "horizonGlow"], ["mass-brightness", "massBrightness"],
    ];
    bindings.forEach(([id, key]) => {
      this.root.querySelector(`#${id}`).addEventListener("input", (event) => {
        this.values[key] = Number(event.target.value);
        this.apply();
      });
    });
    this.root.querySelector("#trail-visible").addEventListener("change", (event) => {
      this.values.trailVisible = event.target.checked;
      this.apply();
    });
    this.root.querySelector("#grid-visible").addEventListener("change", (event) => {
      this.values.gridVisible = event.target.checked;
      this.apply();
    });
    this.root.querySelector("#max-fps").addEventListener("change", (event) => {
      this.values.maxFps = Number(event.target.value);
      this.apply();
    });
    this.root.querySelector("#trail-capacity").addEventListener("change", (event) => {
      const capacity = Number(event.target.value);
      this.trailCapacity.resize(capacity);
      this.trailCapacity.current = capacity;
      this.sync();
    });
    this.root.querySelector("#reset-visuals").addEventListener("click", () => this.reset());
    if (this.scaleTransform) {
      this.root.querySelector("#scale-mode").addEventListener("change", (event) => {
        this.values.scaleMode = event.target.value;
        this.#applyScale(true);
      });
      this.root.querySelector("#physical-scale").addEventListener("change", (event) => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value) || value < 1e6 || value > 1e15) { this.sync(); return; }
        this.values.metresPerWorldUnit = value;
        this.#applyScale(this.values.scaleMode === RenderScaleMode.AUTO_FIT_PHYSICAL);
      });
      this.root.querySelector("#scale-decrease").addEventListener("click", () => this.#stepScale(0.5));
      this.root.querySelector("#scale-increase").addEventListener("click", () => this.#stepScale(2));
      this.root.querySelector("#fit-physical-scene").addEventListener("click", () => this.fitPhysicalScene());
      this.root.querySelector("#show-scale-indicator").addEventListener("change", (event) => {
        this.values.showScaleIndicator = event.target.checked;
        this.scaleIndicator?.setVisible(event.target.checked);
        this.#persistScaleSettings();
      });
      this.root.querySelector("#show-normalized-grid-physical").addEventListener("change", (event) => {
        this.values.showNormalizedGridPhysical = event.target.checked;
        this.#applyScale(false);
      });
      this.root.querySelector("#reset-scale").addEventListener("click", () => this.resetScale());
    }
  }

  apply() {
    this.particleRenderer.setAppearance(this.values);
    this.grid.setAppearance({
      visible: this.values.gridVisible,
      opacity: this.values.gridOpacity,
      brightness: this.values.gridBrightness,
    });
    this.frameRateController.setMaxFps(this.values.maxFps);
    this.massObject.setAppearance({
      horizonOpacity: this.values.horizonGlow,
      emissiveIntensity: this.values.massBrightness,
    });
    if (this.scaleTransform) this.#applyScale(false, false);
    this.sync();
  }

  sync() {
    const values = this.values;
    const pairs = {
      "particle-size": values.particleSize, "particle-brightness": values.particleBrightness,
      "particle-opacity": values.particleOpacity, "trail-opacity": values.trailOpacity,
      "trail-brightness": values.trailBrightness, "trail-fade": values.trailFade,
      "grid-opacity": values.gridOpacity, "grid-brightness": values.gridBrightness,
      "horizon-glow": values.horizonGlow, "mass-brightness": values.massBrightness,
    };
    Object.entries(pairs).forEach(([id, value]) => {
      this.root.querySelector(`#${id}`).value = value;
      this.root.querySelector(`[data-output="${id}"]`).textContent = Number(value).toFixed(2);
    });
    this.root.querySelector("#trail-visible").checked = values.trailVisible;
    this.root.querySelector("#grid-visible").checked = values.gridVisible;
    this.root.querySelector("#max-fps").value = values.maxFps;
    this.root.querySelector("#trail-capacity").value = this.trailCapacity.current;
    if (this.unitFormatter) this.root.querySelector("#display-unit-mode").value = this.unitFormatter.getMode();
    if (this.scaleTransform) {
      this.root.querySelector("#scale-mode").value = values.scaleMode;
      this.root.querySelector("#physical-scale").value = values.metresPerWorldUnit;
      this.root.querySelector("#physical-scale-readable").textContent = t("scale.configuredValue", { value: (values.metresPerWorldUnit / 1000).toExponential(4) });
      this.root.querySelector("#show-scale-indicator").checked = values.showScaleIndicator;
      this.root.querySelector("#show-normalized-grid-physical").checked = values.showNormalizedGridPhysical;
      this.root.querySelector("#physical-scale").disabled = values.scaleMode === RenderScaleMode.NORMALIZED;
      this.root.querySelector("#fit-physical-scene").disabled = values.scaleMode === RenderScaleMode.NORMALIZED;
    }
    this.updateLegends();
  }

  updateLegends() {
    const speed = this.particleRenderer.getSpeedLegend();
    this.root.querySelector("#speed-legend-min").textContent = speed.minimum.toFixed(1);
    this.root.querySelector("#speed-legend-mid").textContent = speed.midpoint.toFixed(1);
    this.root.querySelector("#speed-legend-max").textContent = speed.maximum.toFixed(1);
    const grid = this.grid.getLegend();
    const format = (value) => value === 0 ? "0" : value.toExponential(2);
    this.root.querySelector("#grid-legend-min").textContent = format(grid.rawMinimum);
    this.root.querySelector("#grid-legend-mid").textContent = format(grid.rawMidpoint);
    this.root.querySelector("#grid-legend-max").textContent = format(grid.rawMaximum);
  }

  reset() {
    Object.assign(this.values, DEFAULTS);
    this.apply();
  }

  resetScale() {
    this.values.scaleMode = DEFAULTS.scaleMode;
    this.values.metresPerWorldUnit = DEFAULTS.metresPerWorldUnit;
    this.values.showScaleIndicator = DEFAULTS.showScaleIndicator;
    this.values.showNormalizedGridPhysical = DEFAULTS.showNormalizedGridPhysical;
    this.#applyScale(false);
  }

  #stepScale(factor) {
    this.values.metresPerWorldUnit = Math.max(1e6, Math.min(1e15, this.values.metresPerWorldUnit * factor));
    this.#applyScale(this.values.scaleMode === RenderScaleMode.AUTO_FIT_PHYSICAL);
  }

  #applyScale(shouldFit, notify = true) {
    this.scaleTransform.setMode(this.values.scaleMode);
    this.scaleTransform.setMetresPerWorldUnit(this.values.metresPerWorldUnit);
    this.grid.setAppearance({
      visible: this.values.gridVisible && (!this.scaleTransform.isPhysical() || this.values.showNormalizedGridPhysical),
      opacity: this.values.gridOpacity,
      brightness: this.values.gridBrightness,
    });
    this.scaleIndicator?.setVisible(this.values.showScaleIndicator);
    this.#persistScaleSettings();
    if (notify) this.onScaleChange();
    this.sync();
    if (shouldFit && this.scaleTransform.isPhysical()) this.fitPhysicalScene();
  }

  #restoreScaleSettings() {
    try {
      const saved = JSON.parse(globalThis.localStorage?.getItem(SCALE_STORAGE_KEY) ?? "null");
      if (!saved || typeof saved !== "object") return;
      if (["normalized", "physical", "auto-fit-physical"].includes(saved.scaleMode)) this.values.scaleMode = saved.scaleMode;
      const boundedScale = Math.min(1e15, Math.max(1e6, saved.metresPerWorldUnit));
      if (Number.isFinite(saved.metresPerWorldUnit) && boundedScale === saved.metresPerWorldUnit) this.values.metresPerWorldUnit = boundedScale;
      if (typeof saved.showScaleIndicator === "boolean") this.values.showScaleIndicator = saved.showScaleIndicator;
      if (typeof saved.showNormalizedGridPhysical === "boolean") this.values.showNormalizedGridPhysical = saved.showNormalizedGridPhysical;
    } catch { /* invalid visual preferences use documented defaults */ }
  }

  #persistScaleSettings() {
    try {
      globalThis.localStorage?.setItem(SCALE_STORAGE_KEY, JSON.stringify({
        scaleMode: this.values.scaleMode,
        metresPerWorldUnit: this.values.metresPerWorldUnit,
        showScaleIndicator: this.values.showScaleIndicator,
        showNormalizedGridPhysical: this.values.showNormalizedGridPhysical,
      }));
    } catch { /* storage may be unavailable */ }
  }

  dispose() { this.unsubscribeLocale?.(); this.unsubscribeUnits?.(); }
}
