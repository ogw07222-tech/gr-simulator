import { getUiText } from "./i18n.js";

export class ControlPanel {
  constructor(root, store, model, grid, runtime = null, text = getUiText()) {
    this.root = root;
    this.store = store;
    this.model = model;
    this.grid = grid;
    this.runtime = runtime;
    this.text = text.simulation;
    this.runtimeView = { paused: null, timeScale: null, particleCount: null, simulationTime: null };
    this.render();
    this.bind();
    this.unsubscribe = store.subscribe((state) => this.sync(state));
    this.sync(store.getState());
  }

  render() {
    const text = this.text;
    this.root.setAttribute("aria-label", text.runtimeControls);
    this.root.innerHTML = `
      <div class="panel-heading"><div><span class="section-index">01</span><h2>${text.title}</h2></div><button class="panel-close" data-close-panel type="button" aria-label="${text.closeLabel}">${text.close}</button></div>
      <p class="panel-intro">${text.intro}</p>
      ${this.runtime ? `<section class="panel-section" aria-label="${text.runtimeControls}"><h3>${text.runtime}</h3>
        <div class="runtime-actions">
          <button id="play" class="primary-action" type="button">${text.play}</button>
          <button id="pause" type="button">${text.pause}</button>
          <button id="reset-particle" type="button">${text.resetParticle}</button>
          <button id="reset-all" class="danger-action" type="button">${text.resetAll}</button>
        </div>
        <label class="select-control" for="time-scale"><span>${text.timeScale}</span><select id="time-scale" aria-label="${text.timeScale}">
          ${this.runtime.timeScales.map((scale) => `<option value="${scale}">${scale}배</option>`).join("")}
        </select></label>
      </section>` : ""}
      <section class="panel-section"><h3>${text.physicsInputs}</h3>
        <div class="mode-switch" role="group" aria-label="${text.distanceMode}">
          <button data-mode="GR" type="button">GR 3D</button><button data-mode="GR_W" type="button">GR + W</button>
        </div>
        <label class="range-control" for="mass"><span>${text.mass}</span><output id="mass-value"></output><input id="mass" type="range" min="10" max="300" step="5" /></label>
        <label class="range-control" for="w"><span>${text.wDistance}</span><output id="w-value"></output><input id="w" type="range" min="0" max="6" step="0.05" /></label>
      </section>
      <section class="panel-section"><h3>${text.metricReadout}</h3><div class="metrics">
        <div><small>${text.schwarzschildRadius}</small><strong id="rs"></strong></div>
        <div><small>${text.centralLapse}</small><strong id="lapse"></strong></div>
        <div><small>${text.curvatureProxy}</small><strong id="curvature"></strong></div>
        <div><small>${text.gridVertices}</small><strong id="vertices"></strong></div>
      </div></section>
      ${this.runtime ? `<section class="panel-section"><h3>${text.runtimeStatus}</h3><div class="runtime-status" aria-live="polite">
        <div><small>${text.state}</small><strong id="runtime-state"></strong></div>
        <div><small>${text.simulationTime}</small><strong id="simulation-time"></strong></div>
        <div><small>${text.timeScale}</small><strong id="runtime-time-scale"></strong></div>
        <div><small>${text.particleCount}</small><strong id="particle-count"></strong></div>
      </div></section>` : ""}
      <p class="scientific-note"><strong>${text.modelScope}</strong> ${text.modelScopeDescription}</p>
    `;
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
    this.root.querySelector("#vertices").textContent = this.grid.segmentVertexCount.toLocaleString("ko-KR");
  }

  syncRuntime(state, particleCount) {
    if (!this.runtime) return;
    if (this.runtimeView.paused !== state.paused) {
      this.runtimeView.paused = state.paused;
      this.root.querySelector("#runtime-state").textContent = state.paused ? this.text.pause : this.text.running;
      this.root.querySelector("#play").disabled = !state.paused;
      this.root.querySelector("#pause").disabled = state.paused;
    }
    if (this.runtimeView.timeScale !== state.timeScale) {
      this.runtimeView.timeScale = state.timeScale;
      this.root.querySelector("#time-scale").value = state.timeScale;
      this.root.querySelector("#runtime-time-scale").textContent = `${state.timeScale}배`;
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

  dispose() { this.unsubscribe?.(); }
}
