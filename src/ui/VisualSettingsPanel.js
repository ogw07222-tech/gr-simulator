import { getUiText } from "./i18n.js";

const DEFAULTS = Object.freeze({
  particleSize: 0.36,
  particleOpacity: 1,
  particleBrightness: 1,
  trailVisible: true,
  trailOpacity: 0.88,
  trailBrightness: 1,
  trailFade: 0.82,
  trailColorMode: "single",
  gridVisible: true,
  gridOpacity: 0.52,
  gridBrightness: 0.82,
  horizonGlow: 0.42,
  massBrightness: 1.8,
});

export class VisualSettingsPanel {
  constructor(root, { particleRenderer, grid, massObject }, text = getUiText()) {
    this.root = root;
    this.particleRenderer = particleRenderer;
    this.grid = grid;
    this.massObject = massObject;
    this.text = text.visuals;
    this.values = { ...DEFAULTS };
    this.render();
    this.bind();
    this.apply();
  }

  renderRange(id, label, min, max, step) {
    return `<label class="visual-control" for="${id}"><span>${label}</span><output data-output="${id}"></output>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" /></label>`;
  }

  render() {
    const text = this.text;
    this.root.setAttribute("aria-label", text.title);
    this.root.innerHTML = `
      <div class="panel-heading"><div><span class="section-index">02</span><h2>${text.title}</h2></div><button class="panel-close" data-close-panel type="button" aria-label="${text.closeLabel}">${text.close}</button></div>
      <p class="panel-intro">${text.intro}</p>
      <section class="panel-section"><h3>${text.particle}</h3>
        ${this.renderRange("particle-size", text.particleSize, 0.18, 0.72, 0.02)}
        ${this.renderRange("particle-brightness", text.brightness, 0.5, 1.5, 0.05)}
        ${this.renderRange("particle-opacity", text.opacity, 0.2, 1, 0.05)}
      </section>
      <section class="panel-section"><div class="section-title-row"><h3>${text.trail}</h3><label class="switch"><input id="trail-visible" type="checkbox" /><span>${text.visible}</span></label></div>
        ${this.renderRange("trail-opacity", text.opacity, 0.1, 1, 0.05)}
        ${this.renderRange("trail-brightness", text.brightness, 0.4, 1.5, 0.05)}
        ${this.renderRange("trail-fade", text.ageFade, 0, 1, 0.05)}
        <label class="select-control" for="trail-color-mode"><span>${text.colorMode}</span><select id="trail-color-mode">
          <option value="single">${text.singleColor}</option><option value="speed">${text.speed}</option>
          <option value="distance">${text.distance}</option><option value="age">${text.age}</option>
        </select></label>
        <p id="trail-mode-description" class="control-description"></p>
      </section>
      <section class="panel-section"><div class="section-title-row"><h3>${text.spacetimeGrid}</h3><label class="switch"><input id="grid-visible" type="checkbox" /><span>${text.visible}</span></label></div>
        ${this.renderRange("grid-opacity", text.opacity, 0.08, 0.9, 0.02)}
        ${this.renderRange("grid-brightness", text.brightness, 0.3, 1.2, 0.05)}
      </section>
      <section class="panel-section"><h3>${text.massRendering}</h3>
        ${this.renderRange("horizon-glow", text.horizonIntensity, 0.08, 0.8, 0.02)}
        ${this.renderRange("mass-brightness", text.coreEmissive, 0.5, 3, 0.1)}
      </section>
      <button id="reset-visuals" class="secondary-action" type="button">${text.reset}</button>
    `;
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
    this.root.querySelector("#trail-color-mode").addEventListener("change", (event) => {
      this.values.trailColorMode = event.target.value;
      this.apply();
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
    this.root.querySelector("#trail-color-mode").value = values.trailColorMode;
    this.root.querySelector("#trail-mode-description").textContent = this.text.trailDescriptions[values.trailColorMode];
  }

  reset() {
    Object.assign(this.values, DEFAULTS);
    this.apply();
  }
}
