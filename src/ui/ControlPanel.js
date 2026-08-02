import { getLocale, subscribeLocale, t } from "./i18n.js";

export class ControlPanel {
  constructor(root, store, model, grid, runtime = null) {
    this.root = root;
    this.store = store;
    this.model = model;
    this.grid = grid;
    this.runtime = runtime;
    this.runtimeView = { paused: null, timeScale: null, particleCount: null, simulationTime: null };
    this.render();
    this.bind();
    this.unsubscribe = store.subscribe((state) => this.sync(state));
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
    this.localize();
    this.sync(store.getState());
  }

  render() {
    this.root.innerHTML = `
      <div class="panel-heading"><div><span class="section-index">01</span><h2 data-i18n="panels.simulation"></h2></div><button class="panel-close" data-close-panel type="button" data-i18n="panels.close" data-i18n-aria="panels.closeSimulation"></button></div>
      <p class="panel-intro" data-i18n="controls.runtimeIntro"></p>
      ${this.runtime ? `<section class="panel-section" data-i18n-aria="controls.runtime"><h3 data-i18n="controls.runtime"></h3>
        <div class="runtime-actions">
          <button id="play" class="primary-action" type="button" data-i18n="controls.play"></button>
          <button id="pause" type="button" data-i18n="controls.pause"></button>
          <button id="reset-particle" type="button" data-i18n="controls.resetParticle"></button>
          <button id="reset-all" class="danger-action" type="button" data-i18n="controls.resetAll"></button>
        </div>
        <label class="select-control" for="time-scale"><span data-i18n="controls.timeScale"></span><select id="time-scale" data-i18n-aria="controls.timeScale">
          ${this.runtime.timeScales.map((scale) => `<option value="${scale}" data-scale="${scale}"></option>`).join("")}
        </select></label>
      </section>` : ""}
      <section class="panel-section"><h3 data-i18n="controls.physicsInputs"></h3>
        <div class="mode-switch" role="group" data-i18n-aria="controls.distanceMode">
          <button data-mode="GR" type="button">GR 3D</button><button data-mode="GR_W" type="button">GR + W</button>
        </div>
        <label class="range-control" for="mass"><span data-i18n="controls.mass"></span><output id="mass-value"></output><input id="mass" type="range" min="10" max="300" step="5" /></label>
        <label class="range-control" for="w"><span data-i18n="controls.wDistance"></span><output id="w-value"></output><input id="w" type="range" min="0" max="6" step="0.05" /></label>
      </section>
      <section class="panel-section"><h3 data-i18n="metrics.title"></h3><div class="metrics">
        <div><small data-i18n="metrics.schwarzschildRadius"></small><strong id="rs"></strong></div>
        <div><small data-i18n="metrics.centralLapse"></small><strong id="lapse"></strong></div>
        <div><small data-i18n="metrics.curvatureProxy"></small><strong id="curvature"></strong></div>
        <div><small data-i18n="metrics.gridVertices"></small><strong id="vertices"></strong></div>
      </div></section>
      ${this.runtime ? `<section class="panel-section"><h3 data-i18n="runtime.title"></h3><div class="runtime-status" aria-live="polite">
        <div><small data-i18n="runtime.state"></small><strong id="runtime-state"></strong></div>
        <div><small data-i18n="runtime.simulationTime"></small><strong id="simulation-time"></strong></div>
        <div><small data-i18n="runtime.timeScale"></small><strong id="runtime-time-scale"></strong></div>
        <div><small data-i18n="runtime.particleCount"></small><strong id="particle-count"></strong></div>
      </div></section>` : ""}
      <p class="scientific-note"><strong data-i18n="model.scope"></strong> <span data-i18n="model.scopeDescription"></span></p>
    `;
  }

  localize() {
    this.root.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
    this.root.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
    });
    this.root.setAttribute("aria-label", t("panels.simulation"));
    this.root.querySelectorAll("[data-scale]").forEach((option) => {
      option.textContent = t("units.multiplier", { value: option.dataset.scale });
    });
    if (this.runtime && this.runtimeView.paused !== null) {
      this.root.querySelector("#runtime-state").textContent = t(this.runtimeView.paused ? "status.paused" : "status.running");
      this.root.querySelector("#runtime-time-scale").textContent = t("units.multiplier", { value: this.runtimeView.timeScale });
    }
    this.root.querySelector("#vertices").textContent = this.grid.segmentVertexCount.toLocaleString(getLocale());
  }

  bind() {
    this.root.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => this.store.setState({ mode: button.dataset.mode }));
    });
    this.root.querySelector("#mass").addEventListener("input", (event) => this.store.setState({ mass: Number(event.target.value) }));
    this.root.querySelector("#w").addEventListener("input", (event) => this.store.setState({ w: Number(event.target.value) }));
    if (this.runtime) {
      this.root.querySelector("#play").addEventListener("click", this.runtime.play);
      this.root.querySelector("#pause").addEventListener("click", this.runtime.pause);
      this.root.querySelector("#time-scale").addEventListener("change", (event) => this.runtime.setTimeScale(Number(event.target.value)));
      this.root.querySelector("#reset-particle").addEventListener("click", this.runtime.resetParticle);
      this.root.querySelector("#reset-all").addEventListener("click", this.runtime.resetAll);
    }
  }

  sync(state) {
    const useW = state.mode === "GR_W";
    this.root.querySelectorAll("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    const massInput = this.root.querySelector("#mass");
    const wInput = this.root.querySelector("#w");
    massInput.value = state.mass;
    wInput.value = state.w;
    wInput.disabled = !useW;
    this.root.querySelector("#mass-value").textContent = state.mass.toFixed(0);
    this.root.querySelector("#w-value").textContent = state.w.toFixed(2);

    const sampleRadius = this.model.effectiveRadius(1, 1, 1, state.w, useW);
    this.root.querySelector("#rs").textContent = this.model.schwarzschildRadius(state.mass).toFixed(3);
    this.root.querySelector("#lapse").textContent = this.model.lapse(state.mass, sampleRadius).toFixed(3);
    this.root.querySelector("#curvature").textContent = this.model.curvatureProxy(state.mass, sampleRadius).toFixed(3);
    this.root.querySelector("#vertices").textContent = this.grid.segmentVertexCount.toLocaleString(getLocale());
  }

  syncRuntime(state, particleCount) {
    if (!this.runtime) return;
    if (this.runtimeView.paused !== state.paused) {
      this.runtimeView.paused = state.paused;
      this.root.querySelector("#runtime-state").textContent = t(state.paused ? "status.paused" : "status.running");
      this.root.querySelector("#play").disabled = !state.paused;
      this.root.querySelector("#pause").disabled = state.paused;
    }
    if (this.runtimeView.timeScale !== state.timeScale) {
      this.runtimeView.timeScale = state.timeScale;
      this.root.querySelector("#time-scale").value = state.timeScale;
      this.root.querySelector("#runtime-time-scale").textContent = t("units.multiplier", { value: state.timeScale });
    }
    if (this.runtimeView.particleCount !== particleCount) {
      this.runtimeView.particleCount = particleCount;
      this.root.querySelector("#particle-count").textContent = particleCount;
    }
    const simulationTime = state.simulationTime.toFixed(2);
    if (this.runtimeView.simulationTime !== simulationTime) {
      this.runtimeView.simulationTime = simulationTime;
      this.root.querySelector("#simulation-time").textContent = `${simulationTime} s`;
    }
  }

  dispose() { this.unsubscribe?.(); this.unsubscribeLocale?.(); }
}
