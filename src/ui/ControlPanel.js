import { getLocale, subscribeLocale, t } from "./i18n.js";
import { validateOrbitConfiguration } from "./OrbitInputValidation.js";
import { helpButton } from "./ScientificHelp.js";

export class ControlPanel {
  constructor(root, store, model, grid, runtime = null) {
    this.root = root;
    this.store = store;
    this.model = model;
    this.grid = grid;
    this.runtime = runtime;
    this.runtimeView = { paused: null, timeScale: null, particleCount: null, simulationTime: null };
    this.geodesicView = { snapshot: null, lastRefresh: 0 };
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
      ${this.runtime ? `<details class="panel-section control-disclosure" open><summary><span data-i18n="controls.runtime"></span></summary><div class="disclosure-body">
        <div class="runtime-actions">
          <button id="play" class="primary-action" type="button" data-i18n="controls.play"></button>
          <button id="pause" type="button" data-i18n="controls.pause"></button>
          <button id="reset-particle" type="button" data-i18n="controls.resetParticle"></button>
          <button id="reset-all" class="danger-action" type="button" data-i18n="controls.resetAll"></button>
        </div>
        <label class="select-control" for="time-scale"><span data-i18n="controls.timeScale"></span><select id="time-scale" data-i18n-aria="controls.timeScale">
          ${this.runtime.timeScales.map((scale) => `<option value="${scale}" data-scale="${scale}"></option>`).join("")}
        </select></label>
      </div></details>` : ""}
      <details class="panel-section control-disclosure" open><summary><span data-i18n="controls.centralBody"></span></summary><div class="disclosure-body"><h3 data-i18n="controls.physicsInputs"></h3>
        <div class="mode-switch" role="group" data-i18n-aria="controls.distanceMode">
          <button data-mode="GR" type="button">GR 3D</button><button data-mode="GR_W" type="button">GR + W</button>
        </div>
        <label class="range-control" for="mass"><span><span data-i18n="controls.mass"></span>${helpButton("mass")}</span><output id="mass-value"></output><input id="mass" type="range" min="10" max="300" step="5" /></label>
        <label class="range-control" for="w"><span data-i18n="controls.wDistance"></span><output id="w-value"></output><input id="w" type="range" min="0" max="6" step="0.05" /></label>
      </div></details>
      <section class="panel-section"><h3 data-i18n="metrics.title"></h3><div class="metrics">
        <div><small data-i18n="metrics.schwarzschildRadius"></small><strong id="rs"></strong></div>
        <div><small data-i18n="metrics.centralLapse"></small><strong id="lapse"></strong></div>
        <div><small data-i18n="metrics.curvatureProxy"></small><strong id="curvature"></strong></div>
        <div><small data-i18n="metrics.gridVertices"></small><strong id="vertices"></strong></div>
      </div></section>
      ${this.runtime?.applyOrbit ? `<details class="panel-section control-disclosure orbit-setup" open><summary><span data-i18n="orbit.setup"></span></summary><div class="disclosure-body">
        <h3 data-i18n="orbit.step1"></h3><p class="control-description" data-i18n="orbit.step1Description"></p>
        <label class="select-control" for="orbit-preset"><span data-i18n="orbit.preset"></span><select id="orbit-preset">
          <option value="circular" data-i18n="orbit.circular"></option>
          <option value="local" data-i18n="orbit.localVelocity"></option>
          <option value="constants" data-i18n="orbit.constants"></option>
        </select></label>
        <h3 data-i18n="orbit.step2"></h3>
        <label class="numeric-control" for="black-hole-mass"><span><span data-i18n="orbit.massSolar"></span>${helpButton("mass")}</span><input id="black-hole-mass" type="number" min="1" max="10000000000" step="1" /></label>
        <label class="numeric-control" for="orbit-radius"><span><span data-i18n="orbit.radiusRs"></span>${helpButton("schwarzschildRadius")}</span><input id="orbit-radius" type="number" min="1.000001" max="10" step="0.01" /></label>
        <output id="orbit-radius-km" class="derived-value"></output>
        <div class="orbit-local-inputs">
          <label class="numeric-control" for="radial-beta"><span><span data-i18n="orbit.radialVelocity"></span>${helpButton("localVelocity")}</span><input id="radial-beta" type="number" min="-0.999" max="0.999" step="0.001" /></label>
          <label class="numeric-control" for="tangential-beta"><span data-i18n="orbit.tangentialVelocity"></span><input id="tangential-beta" type="number" min="-0.999" max="0.999" step="0.001" /></label>
          <output id="orbit-speed" class="derived-value"></output>
        </div>
        <div class="advanced-controls orbit-conserved-inputs">
          <div class="orbit-constant-inputs">
            <label class="numeric-control" for="specific-energy"><span><span data-i18n="orbit.specificEnergy"></span>${helpButton("specificEnergy")}</span><input id="specific-energy" type="number" min="0.001" step="0.001" /></label>
            <label class="numeric-control" for="specific-angular-momentum"><span><span data-i18n="orbit.specificAngularMomentum"></span>${helpButton("angularMomentum")}</span><input id="specific-angular-momentum" type="number" step="0.001" /></label>
            <label class="select-control" for="radial-direction"><span data-i18n="orbit.radialDirection"></span><select id="radial-direction"><option value="1" data-i18n="orbit.outward"></option><option value="-1" data-i18n="orbit.inward"></option></select></label>
          </div>
        </div>
        <h3 data-i18n="orbit.step3"></h3><p class="control-description" data-i18n="orbit.step3Description"></p>
        <button id="apply-orbit" class="primary-action" type="button" data-i18n="orbit.apply"></button>
        <p id="orbit-error" class="input-error" role="alert" hidden></p>
        <output id="orbit-result" class="apply-result" role="status" aria-live="polite" hidden></output>
      </div></details>
      <details class="panel-section control-disclosure"><summary><span data-i18n="orbit.numericalIntegration"></span></summary><div class="disclosure-body">
        <label class="numeric-control" for="maximum-substeps"><span data-i18n="orbit.maximumSubsteps"></span><input id="maximum-substeps" type="number" min="1" max="4096" step="1" /></label>
        <dl class="solver-facts"><div><dt data-i18n="orbit.fixedTimestep"></dt><dd data-i18n="orbit.fixedTimestepValue"></dd></div><div><dt data-i18n="orbit.normalizedStep"></dt><dd data-i18n="orbit.normalizedStepValue"></dd></div></dl>
        <p class="scientific-note"><span data-i18n="orbit.integrator"></span>${helpButton("integrator")}</p><button id="restore-integrator" class="secondary-action" type="button" data-i18n="orbit.restoreDefaults"></button>
      </div></details>` : ""}
      ${this.runtime ? `<section class="panel-section"><h3 data-i18n="runtime.title"></h3><div class="runtime-status" aria-live="polite">
        <div><small data-i18n="runtime.state"></small><strong id="runtime-state"></strong></div>
        <div><small data-i18n="runtime.simulationTime"></small><strong id="simulation-time"></strong></div>
        <div><small data-i18n="runtime.timeScale"></small><strong id="runtime-time-scale"></strong></div>
        <div><small data-i18n="runtime.particleCount"></small><strong id="particle-count"></strong></div>
      </div></section>` : ""}
      ${this.runtime?.applyOrbit ? `<details class="panel-section control-disclosure scientific-measurements"><summary><span data-i18n="geodesic.title"></span></summary><div class="disclosure-body"><div class="runtime-status geodesic-status" aria-live="polite">
        <div><small data-i18n="geodesic.mass"></small><strong id="geo-mass"></strong></div>
        <div><small data-i18n="geodesic.schwarzschildRadius"></small><strong id="geo-rs"></strong></div>
        <div><small data-i18n="geodesic.radius"></small><strong id="geo-radius"></strong></div>
        <div><small data-i18n="geodesic.localSpeed"></small><strong id="geo-speed"></strong></div>
        <div><small><span data-i18n="geodesic.coordinateTime"></span>${helpButton("coordinateTime")}</small><strong id="geo-coordinate-time"></strong></div>
        <div><small><span data-i18n="geodesic.properTime"></span>${helpButton("properTime")}</small><strong id="geo-proper-time"></strong></div>
        <div><small><span data-i18n="geodesic.energy"></span>${helpButton("specificEnergy")}</small><strong id="geo-energy"></strong></div>
        <div><small><span data-i18n="geodesic.angularMomentum"></span>${helpButton("angularMomentum")}</small><strong id="geo-angular-momentum"></strong></div>
        <div><small><span data-i18n="geodesic.classification"></span>${helpButton("classification")}</small><strong id="geo-classification"></strong></div>
        <div><small data-i18n="geodesic.status"></small><strong id="geo-status"></strong></div>
        <div><small data-i18n="geodesic.energyDrift"></small><strong id="geo-energy-drift"></strong></div>
        <div><small data-i18n="geodesic.angularMomentumDrift"></small><strong id="geo-angular-drift"></strong></div>
        <div><small><span data-i18n="geodesic.normalizationResidual"></span>${helpButton("residual")}</small><strong id="geo-normalization"></strong></div>
        <div><small data-i18n="geodesic.substeps"></small><strong id="geo-substeps"></strong></div>
      </div></div></details>` : ""}
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
    if (this.runtime?.applyOrbit && this.geodesicView.snapshot) this.#writeGeodesic(this.geodesicView.snapshot);
    if (this.runtime?.applyOrbit) this.#syncOrbitDerived();
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
      if (!this.runtime.applyOrbit) return;
      const configuration = this.runtime.getOrbitConfiguration();
      this.root.querySelector("#orbit-preset").value = configuration.preset;
      this.root.querySelector("#black-hole-mass").value = configuration.massSolar;
      this.root.querySelector("#orbit-radius").value = configuration.radius;
      this.root.querySelector("#radial-beta").value = configuration.radialBeta;
      this.root.querySelector("#tangential-beta").value = configuration.tangentialBeta;
      this.root.querySelector("#specific-energy").value = configuration.energy;
      this.root.querySelector("#specific-angular-momentum").value = configuration.angularMomentum;
      this.root.querySelector("#radial-direction").value = configuration.radialDirection;
      this.root.querySelector("#maximum-substeps").value = configuration.maximumSubsteps;
      this.root.querySelector("#orbit-preset").addEventListener("change", () => this.#syncOrbitInputs());
      this.root.querySelectorAll(".orbit-setup input").forEach((input) => input.addEventListener("input", () => this.#syncOrbitDerived()));
      this.root.querySelector("#apply-orbit").addEventListener("click", () => this.#applyOrbit());
      this.root.querySelector("#restore-integrator").addEventListener("click", () => { this.root.querySelector("#maximum-substeps").value = 128; });
      this.#syncOrbitInputs();
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

  syncGeodesic(snapshot, runtimeState = null) {
    if (!this.runtime?.applyOrbit || !snapshot || globalThis.performance.now() - this.geodesicView.lastRefresh < 100) return;
    this.geodesicView.snapshot = snapshot;
    this.geodesicView.paused = runtimeState?.paused ?? false;
    this.geodesicView.lastRefresh = globalThis.performance.now();
    this.#writeGeodesic(snapshot);
  }

  #syncOrbitInputs() {
    const preset = this.root.querySelector("#orbit-preset").value;
    this.root.querySelector(".orbit-local-inputs").hidden = preset !== "local";
    this.root.querySelector(".orbit-constant-inputs").hidden = preset !== "constants";
    this.#syncOrbitDerived();
  }

  #syncOrbitDerived() {
    const massSolar = Number(this.root.querySelector("#black-hole-mass").value);
    const radius = Number(this.root.querySelector("#orbit-radius").value);
    const radiusKm = massSolar * 2.953339382066878 * radius;
    const radial = Number(this.root.querySelector("#radial-beta").value);
    const tangential = Number(this.root.querySelector("#tangential-beta").value);
    const speed = Math.sqrt(radial * radial + tangential * tangential);
    this.root.querySelector("#orbit-radius-km").textContent = t("orbit.radiusKmValue", { value: radiusKm.toExponential(4) });
    this.root.querySelector("#orbit-speed").textContent = t("orbit.speedValue", {
      kilometres: (speed * 299792.458).toFixed(2), fraction: speed.toFixed(5),
    });
  }

  #applyOrbit() {
    const error = this.root.querySelector("#orbit-error");
    const configuration = {
      preset: this.root.querySelector("#orbit-preset").value,
      massSolar: Number(this.root.querySelector("#black-hole-mass").value),
      radius: Number(this.root.querySelector("#orbit-radius").value),
      radialBeta: Number(this.root.querySelector("#radial-beta").value),
      tangentialBeta: Number(this.root.querySelector("#tangential-beta").value),
      energy: Number(this.root.querySelector("#specific-energy").value),
      angularMomentum: Number(this.root.querySelector("#specific-angular-momentum").value),
      radialDirection: Number(this.root.querySelector("#radial-direction").value),
      maximumSubsteps: Number(this.root.querySelector("#maximum-substeps").value),
    };
    const errorKey = validateOrbitConfiguration(configuration);
    if (errorKey) {
      error.textContent = t(errorKey);
      error.hidden = false;
      return;
    }
    try {
      this.runtime.applyOrbit(configuration);
      error.hidden = true;
      const result = this.root.querySelector("#orbit-result");
      result.textContent = t("orbit.applied");
      result.hidden = false;
    } catch {
      error.textContent = t("orbit.errorInitialCondition");
      error.hidden = false;
    }
  }

  #writeGeodesic(snapshot) {
    const format = (value, digits = 4) => Number(value).toExponential(digits);
    this.root.querySelector("#geo-mass").textContent = `${format(snapshot.massSolar)} M☉ / ${format(snapshot.massKg)} kg`;
    this.root.querySelector("#geo-rs").textContent = `${format(snapshot.schwarzschildRadiusMetres / 1000)} km`;
    this.root.querySelector("#geo-radius").textContent = `${snapshot.radiusRs.toFixed(6)} rₛ / ${format(snapshot.radiusMetres / 1000)} km`;
    this.root.querySelector("#geo-speed").textContent = `${format(snapshot.localSpeedMetresPerSecond / 1000)} km/s / ${snapshot.localSpeedFraction.toFixed(6)} c`;
    this.root.querySelector("#geo-coordinate-time").textContent = `${format(snapshot.coordinateTime)} s`;
    this.root.querySelector("#geo-proper-time").textContent = `${format(snapshot.properTime)} s`;
    this.root.querySelector("#geo-energy").textContent = snapshot.energy.toFixed(10);
    this.root.querySelector("#geo-angular-momentum").textContent = `${snapshot.angularMomentum.toFixed(8)} / ${format(snapshot.angularMomentumSI)} m²/s`;
    this.root.querySelector("#geo-classification").textContent = t(`orbit.classification.${snapshot.orbitClassification}`);
    this.root.querySelector("#geo-status").textContent = t(`orbit.status.${this.geodesicView.paused ? "Paused" : snapshot.geodesicStatus}`);
    this.root.querySelector("#geo-energy-drift").textContent = format(snapshot.energyDrift);
    this.root.querySelector("#geo-angular-drift").textContent = format(snapshot.angularMomentumDrift);
    this.root.querySelector("#geo-normalization").textContent = format(snapshot.normalizationResidual);
    this.root.querySelector("#geo-substeps").textContent = snapshot.integrationSubsteps.toLocaleString(getLocale());
  }

  dispose() { this.unsubscribe?.(); this.unsubscribeLocale?.(); }
}
