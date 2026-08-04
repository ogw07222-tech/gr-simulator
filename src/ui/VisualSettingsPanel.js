import { subscribeLocale, t } from "./i18n.js";

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
});

export class VisualSettingsPanel {
  constructor(root, { particleRenderer, grid, massObject, frameRateController = null, trailCapacity = null }) {
    this.root = root;
    this.particleRenderer = particleRenderer;
    this.grid = grid;
    this.massObject = massObject;
    this.frameRateController = frameRateController ?? { maxFps: 60, setMaxFps() {} };
    this.trailCapacity = trailCapacity ?? {
      current: particleRenderer.maxTrailLength,
      options: [particleRenderer.maxTrailLength],
      resize: () => false,
    };
    this.values = { ...DEFAULTS };
    this.values.maxFps = this.frameRateController.maxFps;
    this.render();
    this.bind();
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
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
      <section class="panel-section"><h3 data-i18n="visual.performance"></h3>
        <label class="select-control" for="max-fps"><span data-i18n="visual.maximumFps"></span><select id="max-fps">
          <option value="30">30 FPS</option><option value="45">45 FPS</option><option value="60">60 FPS</option><option value="90">90 FPS</option><option value="120">120 FPS</option><option value="0" data-i18n="visual.unlimited"></option>
        </select></label>
        <p class="control-description" data-i18n="visual.fpsNote"></p>
      </section>
      <section class="panel-section"><h3 data-i18n="visual.particle"></h3>
        ${this.renderRange("particle-size", "visual.particleSize", 0.18, 0.72, 0.02)}
        ${this.renderRange("particle-brightness", "visual.brightness", 0.5, 1.5, 0.05)}
        ${this.renderRange("particle-opacity", "visual.opacity", 0.2, 1, 0.05)}
      </section>
      <section class="panel-section"><div class="section-title-row"><h3 data-i18n="visual.trail"></h3><label class="switch"><input id="trail-visible" type="checkbox" /><span data-i18n="visual.visible"></span></label></div>
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
      </section>
      <section class="panel-section"><div class="section-title-row"><h3 data-i18n="visual.spacetimeGrid"></h3><label class="switch"><input id="grid-visible" type="checkbox" /><span data-i18n="visual.visible"></span></label></div>
        ${this.renderRange("grid-opacity", "visual.opacity", 0.08, 0.9, 0.02)}
        ${this.renderRange("grid-brightness", "visual.brightness", 0.3, 1.2, 0.05)}
        <div class="scientific-legend" aria-live="polite">
          <div class="legend-heading"><strong data-i18n="legend.gridTitle"></strong><small data-i18n="legend.gridUnit"></small></div>
          <div class="legend-gradient grid-gradient" aria-hidden="true"></div>
          <div class="legend-values"><span id="grid-legend-min"></span><span id="grid-legend-mid"></span><span id="grid-legend-max"></span></div>
          <p data-i18n="legend.gridScale"></p>
        </div>
      </section>
      <section class="panel-section"><h3 data-i18n="visual.massRendering"></h3>
        ${this.renderRange("horizon-glow", "visual.horizonIntensity", 0.08, 0.8, 0.02)}
        ${this.renderRange("mass-brightness", "visual.coreEmissive", 0.5, 3, 0.1)}
      </section>
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
  }

  bind() {
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

  dispose() { this.unsubscribeLocale?.(); }
}
