import { getLocale, subscribeLocale, t } from "./i18n.js";
import { validateOrbitConfiguration } from "./OrbitInputValidation.js";
import { helpButton } from "./ScientificHelp.js";
import { MAX_TIME_SCALE, MIN_TIME_SCALE } from "../systems/index.js";

const FALLBACK_PRECESSION_DEMO = Object.freeze({
  minimumEccentricity: 0.05,
  maximumEccentricity: 0.5,
  defaultEccentricity: 0.3,
});

export class ControlPanel {
  constructor(root, model, grid, runtime = null, unitFormatter = null) {
    this.root = root;
    this.model = model;
    this.grid = grid;
    this.runtime = runtime;
    this.unitFormatter = unitFormatter;
    this.runtimeView = { paused: null, timeScale: null, particleCount: null, simulationTime: null };
    this.geodesicView = { snapshot: null, lastRefresh: 0 };
    this.activeOrbitPreset = null;
    this.precessionReturnDraft = null;
    this.render();
    this.bind();
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
    this.localize();
    this.sync();
  }

  render() {
    const precession = this.runtime?.precessionDemo ?? FALLBACK_PRECESSION_DEMO;
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
          <option value="custom" data-i18n="controls.customTimeScale"></option>
        </select></label>
        <div id="custom-time-scale-controls" class="numeric-control" hidden><label for="custom-time-scale"><span data-i18n="controls.customTimeScale"></span><input id="custom-time-scale" type="number" min="${MIN_TIME_SCALE}" max="${MAX_TIME_SCALE}" step="any" inputmode="decimal" /></label><button id="apply-time-scale" type="button" data-i18n="controls.applyTimeScale"></button></div>
        <p id="time-scale-error" class="input-error" role="alert" hidden></p>
      </div></details>` : ""}
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
          <option value="precession" data-i18n="orbit.precessionDemo"></option>
          <option value="local" data-i18n="orbit.localVelocity"></option>
          <option value="constants" data-i18n="orbit.constants"></option>
        </select></label>
        <div class="precession-demo-controls" hidden>
          <label class="range-control" for="orbit-eccentricity"><span><span data-i18n="orbit.eccentricity"></span>${helpButton("eccentricity")}</span><output id="orbit-eccentricity-value"></output><input id="orbit-eccentricity" type="range" min="${precession.minimumEccentricity}" max="${precession.maximumEccentricity}" step="0.01" /></label>
          <p class="control-description"><span data-i18n="orbit.eccentricityLow"></span> ←────────→ <span data-i18n="orbit.eccentricityHigh"></span></p>
        </div>
        <h3 data-i18n="orbit.step2"></h3>
        <label class="numeric-control" for="black-hole-mass"><span><span data-i18n="orbit.massSolar"></span>${helpButton("mass")}</span><input id="black-hole-mass" type="number" min="1" max="10000000000" step="any" inputmode="decimal" /></label>
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
        <div class="precession-generated-values" hidden aria-live="polite">
          <h3 data-i18n="orbit.generatedTitle"></h3>
          <p class="control-description" data-i18n="orbit.generatedDescription"></p>
          <dl class="solver-facts">
            <div><dt data-i18n="orbit.eccentricitySymbol"></dt><dd id="precession-eccentricity"></dd></div>
            <div><dt data-i18n="orbit.semiLatusRectum"></dt><dd id="precession-p"></dd></div>
            <div><dt data-i18n="orbit.periapsis"></dt><dd id="precession-periapsis"></dd></div>
            <div><dt data-i18n="orbit.apocenter"></dt><dd id="precession-apocenter"></dd></div>
            <div><dt data-i18n="orbit.startingRadius"></dt><dd id="precession-starting-radius"></dd></div>
            <div><dt data-i18n="orbit.specificEnergy"></dt><dd id="precession-energy"></dd></div>
            <div><dt data-i18n="orbit.specificAngularMomentum"></dt><dd id="precession-angular-momentum"></dd></div>
            <div><dt data-i18n="orbit.initialRadialSpeed"></dt><dd id="precession-radial-speed"></dd></div>
            <div><dt data-i18n="orbit.initialTangentialSpeed"></dt><dd id="precession-tangential-speed"></dd></div>
            <div><dt data-i18n="orbit.expectedClassification"></dt><dd id="precession-classification"></dd></div>
          </dl>
          <p class="scientific-note" data-i18n="orbit.precessionPhysicsNote"></p>
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
        <div><small data-i18n="runtime.effectiveTimeScale"></small><strong id="runtime-effective-time-scale"></strong></div>
        <div><small data-i18n="runtime.particleCount"></small><strong id="particle-count"></strong></div>
        <div><small data-i18n="runtime.trailSamples"></small><strong id="runtime-trail-samples"></strong></div>
        <div><small data-i18n="runtime.trailCapacity"></small><strong id="runtime-trail-capacity"></strong></div>
        <div><small data-i18n="runtime.radialPeriods"></small><strong id="runtime-radial-periods"></strong></div>
        <div><small data-i18n="runtime.periapsisAdvance"></small><strong id="runtime-periapsis-advance"></strong></div>
      </div></section>` : ""}
      ${this.runtime?.applyOrbit ? `<details class="panel-section control-disclosure scientific-measurements"><summary><span data-i18n="geodesic.title"></span></summary><div class="disclosure-body"><div class="runtime-status geodesic-status" aria-live="polite">
        <div><small data-i18n="geodesic.mass"></small><strong id="geo-mass"></strong></div>
        <div><small data-i18n="geodesic.schwarzschildRadius"></small><strong id="geo-rs"></strong></div>
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
    if (this.runtime) this.#validateTimeScale(null);
    if (this.runtime && this.runtimeView.paused !== null) {
      this.root.querySelector("#runtime-state").textContent = t(this.runtimeView.paused ? "status.paused" : "status.running");
      this.root.querySelector("#runtime-time-scale").textContent = t("units.multiplier", { value: this.runtimeView.timeScale });
    }
    if (this.runtime?.applyOrbit && this.geodesicView.snapshot) this.#writeGeodesic(this.geodesicView.snapshot);
    if (this.runtime?.applyOrbit) this.#syncOrbitDerived();
    this.root.querySelector("#vertices").textContent = this.grid.segmentVertexCount.toLocaleString(getLocale());
  }

  bind() {
    if (this.runtime) {
      this.root.querySelector("#play").addEventListener("click", this.runtime.play);
      this.root.querySelector("#pause").addEventListener("click", this.runtime.pause);
      this.root.querySelector("#time-scale").addEventListener("change", (event) => {
        const custom = event.target.value === "custom";
        this.root.querySelector("#custom-time-scale-controls").hidden = !custom;
        if (!custom) this.#validateTimeScale(Number(event.target.value));
      });
      this.root.querySelector("#apply-time-scale").addEventListener("click", () => this.#validateTimeScale(Number(this.root.querySelector("#custom-time-scale").value)));
      this.root.querySelector("#custom-time-scale").addEventListener("keydown", (event) => {
        if (event.key === "Enter") this.#validateTimeScale(Number(event.currentTarget.value));
      });
      this.root.querySelector("#reset-particle").addEventListener("click", this.runtime.resetParticle);
      this.root.querySelector("#reset-all").addEventListener("click", this.runtime.resetAll);
      if (!this.runtime.applyOrbit) return;
      const configuration = this.runtime.getOrbitConfiguration();
      const precession = this.runtime.precessionDemo ?? FALLBACK_PRECESSION_DEMO;
      this.root.querySelector("#orbit-preset").value = configuration.preset;
      this.root.querySelector("#black-hole-mass").value = configuration.massSolar;
      this.root.querySelector("#orbit-radius").value = configuration.radius;
      this.root.querySelector("#orbit-eccentricity").value = configuration.eccentricity ?? precession.defaultEccentricity;
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

  sync() {
    const normalizedMass = this.model.c * this.model.c / (2 * this.model.G);
    const sampleRadius = this.model.spatialRadius(1, 1, 1);
    this.root.querySelector("#rs").textContent = this.model.schwarzschildRadius(normalizedMass).toFixed(3);
    this.root.querySelector("#lapse").textContent = this.model.lapse(normalizedMass, sampleRadius).toFixed(3);
    this.root.querySelector("#curvature").textContent = this.model.curvatureProxy(normalizedMass, sampleRadius).toFixed(3);
    this.root.querySelector("#vertices").textContent = this.grid.segmentVertexCount.toLocaleString(getLocale());
  }

  syncRuntime(state, particleCount, diagnostics = null) {
    if (!this.runtime) return;
    if (this.runtimeView.paused !== state.paused) {
      this.runtimeView.paused = state.paused;
      this.root.querySelector("#runtime-state").textContent = t(state.paused ? "status.paused" : "status.running");
      this.root.querySelector("#play").disabled = !state.paused;
      this.root.querySelector("#pause").disabled = state.paused;
    }
    if (this.runtimeView.timeScale !== state.timeScale) {
      this.runtimeView.timeScale = state.timeScale;
      const preset = this.runtime.timeScales.includes(state.timeScale);
      this.root.querySelector("#time-scale").value = preset ? String(state.timeScale) : "custom";
      this.root.querySelector("#custom-time-scale-controls").hidden = preset;
      if (!preset) this.root.querySelector("#custom-time-scale").value = state.timeScale;
      this.root.querySelector("#runtime-time-scale").textContent = t("units.multiplier", { value: state.timeScale });
    }
    if (this.runtimeView.particleCount !== particleCount) {
      this.runtimeView.particleCount = particleCount;
      this.root.querySelector("#particle-count").textContent = particleCount;
    }
    const simulationTime = this.unitFormatter?.formatTime(state.simulationTime) ?? `${state.simulationTime.toFixed(2)} s`;
    if (this.runtimeView.simulationTime !== simulationTime) {
      this.runtimeView.simulationTime = simulationTime;
      this.root.querySelector("#simulation-time").textContent = simulationTime;
    }
    if (diagnostics) {
      this.root.querySelector("#runtime-effective-time-scale").textContent = t("units.multiplier", { value: diagnostics.effectiveTimeScale.toFixed(1) });
      this.root.querySelector("#runtime-trail-samples").textContent = diagnostics.trailSamples.toLocaleString(getLocale());
      this.root.querySelector("#runtime-trail-capacity").textContent = diagnostics.trailCapacity.toLocaleString(getLocale());
      this.root.querySelector("#runtime-radial-periods").textContent = diagnostics.radialPeriods.toLocaleString(getLocale());
      this.root.querySelector("#runtime-periapsis-advance").textContent = diagnostics.radialPeriods > 0 && Number.isFinite(diagnostics.periapsisAdvance)
        ? t("runtime.periapsisAdvanceValue", { value: (diagnostics.periapsisAdvance * 180 / Math.PI).toFixed(2) })
        : t("runtime.notAvailable");
    }
  }

  syncGeodesic(snapshot) {
    if (!this.runtime?.applyOrbit || !snapshot || globalThis.performance.now() - this.geodesicView.lastRefresh < 100) return;
    this.geodesicView.snapshot = snapshot;
    this.geodesicView.lastRefresh = globalThis.performance.now();
    this.#writeGeodesic(snapshot);
  }

  #captureOrbitDraft() {
    return {
      radius: this.root.querySelector("#orbit-radius").value,
      radialBeta: this.root.querySelector("#radial-beta").value,
      tangentialBeta: this.root.querySelector("#tangential-beta").value,
      energy: this.root.querySelector("#specific-energy").value,
      angularMomentum: this.root.querySelector("#specific-angular-momentum").value,
      radialDirection: this.root.querySelector("#radial-direction").value,
    };
  }

  #restoreOrbitDraft(draft) {
    if (!draft) return;
    this.root.querySelector("#orbit-radius").value = draft.radius;
    this.root.querySelector("#radial-beta").value = draft.radialBeta;
    this.root.querySelector("#tangential-beta").value = draft.tangentialBeta;
    this.root.querySelector("#specific-energy").value = draft.energy;
    this.root.querySelector("#specific-angular-momentum").value = draft.angularMomentum;
    this.root.querySelector("#radial-direction").value = draft.radialDirection;
  }

  #setDemoInputLock(locked) {
    ["#orbit-radius", "#radial-beta", "#tangential-beta", "#specific-energy", "#specific-angular-momentum"].forEach((selector) => {
      const input = this.root.querySelector(selector);
      input.readOnly = locked;
      input.disabled = locked;
      input.setAttribute("aria-readonly", String(locked));
    });
    this.root.querySelector("#radial-direction").disabled = locked;
  }

  #syncOrbitInputs() {
    const preset = this.root.querySelector("#orbit-preset").value;
    const enteringPrecession = preset === "precession" && this.activeOrbitPreset !== "precession";
    const leavingPrecession = preset !== "precession" && this.activeOrbitPreset === "precession";
    if (enteringPrecession) this.precessionReturnDraft = this.#captureOrbitDraft();
    if (leavingPrecession) {
      this.#restoreOrbitDraft(this.precessionReturnDraft);
      this.precessionReturnDraft = null;
    }
    this.activeOrbitPreset = preset;

    const isPrecession = preset === "precession";
    this.root.querySelector(".precession-demo-controls").hidden = !isPrecession;
    this.root.querySelector(".precession-generated-values").hidden = !isPrecession;
    this.root.querySelector(".orbit-local-inputs").hidden = preset !== "local";
    this.root.querySelector(".orbit-constant-inputs").hidden = preset !== "constants" && !isPrecession;
    this.#setDemoInputLock(isPrecession);
    this.#syncOrbitDerived();
  }

  #writeBasicDerived() {
    const massSolar = Number(this.root.querySelector("#black-hole-mass").value);
    const radius = Number(this.root.querySelector("#orbit-radius").value);
    const radiusKm = massSolar * 2.953339382066878 * radius;
    const radial = Number(this.root.querySelector("#radial-beta").value);
    const tangential = Number(this.root.querySelector("#tangential-beta").value);
    const speed = Math.sqrt(radial * radial + tangential * tangential);
    this.root.querySelector("#orbit-radius-km").textContent = t("orbit.radiusDisplayValue", { value: this.unitFormatter?.formatDistance(radiusKm * 1000) ?? `${radiusKm.toExponential(4)} km` });
    this.root.querySelector("#orbit-speed").textContent = t("orbit.speedValue", {
      kilometres: (speed * 299792.458).toFixed(2), fraction: speed.toFixed(5),
    });
  }

  #syncPrecessionPreview() {
    const error = this.root.querySelector("#orbit-error");
    const eccentricity = Number(this.root.querySelector("#orbit-eccentricity").value);
    this.root.querySelector("#orbit-eccentricity-value").textContent = eccentricity.toFixed(2);
    try {
      const demo = this.runtime.previewPrecessionDemo(eccentricity);
      this.root.querySelector("#orbit-radius").value = demo.startingRadius.toPrecision(15);
      this.root.querySelector("#radial-beta").value = demo.radialBeta.toPrecision(15);
      this.root.querySelector("#tangential-beta").value = demo.tangentialBeta.toPrecision(15);
      this.root.querySelector("#specific-energy").value = demo.energy.toPrecision(15);
      this.root.querySelector("#specific-angular-momentum").value = demo.angularMomentum.toPrecision(15);
      this.root.querySelector("#radial-direction").value = String(demo.radialDirection);
      this.root.querySelector("#precession-eccentricity").textContent = demo.eccentricity.toFixed(2);
      this.root.querySelector("#precession-p").textContent = `${demo.semiLatusRectumM.toFixed(2)} GM/c²`;
      this.root.querySelector("#precession-periapsis").textContent = `${demo.periapsisRadius.toFixed(6)} rₛ`;
      this.root.querySelector("#precession-apocenter").textContent = `${demo.apocenterRadius.toFixed(6)} rₛ`;
      this.root.querySelector("#precession-starting-radius").textContent = `${demo.startingRadius.toFixed(6)} rₛ (${t("orbit.periapsisStart")})`;
      this.root.querySelector("#precession-energy").textContent = demo.energy.toFixed(10);
      this.root.querySelector("#precession-angular-momentum").textContent = demo.angularMomentum.toFixed(10);
      this.root.querySelector("#precession-radial-speed").textContent = `${demo.radialBeta.toFixed(6)} c`;
      this.root.querySelector("#precession-tangential-speed").textContent = `${demo.tangentialBeta.toFixed(6)} c`;
      this.root.querySelector("#precession-classification").textContent = t(`orbit.classification.${demo.expectedClassification}`);
      error.hidden = true;
      this.#writeBasicDerived();
      return demo;
    } catch {
      error.textContent = t("orbit.errorEccentricity", {
        minimum: this.root.querySelector("#orbit-eccentricity").min,
        maximum: this.root.querySelector("#orbit-eccentricity").max,
      });
      error.hidden = false;
      return null;
    }
  }

  #syncOrbitDerived() {
    if (this.root.querySelector("#orbit-preset").value === "precession") {
      this.#syncPrecessionPreview();
      return;
    }
    this.#writeBasicDerived();
  }

  #applyOrbit() {
    const error = this.root.querySelector("#orbit-error");
    const preset = this.root.querySelector("#orbit-preset").value;
    if (preset === "precession" && !this.#syncPrecessionPreview()) return;
    const configuration = {
      preset,
      massSolar: Number(this.root.querySelector("#black-hole-mass").value),
      radius: Number(this.root.querySelector("#orbit-radius").value),
      eccentricity: Number(this.root.querySelector("#orbit-eccentricity").value),
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
    this.root.querySelector("#geo-mass").textContent = this.unitFormatter?.formatMass(snapshot.massKg) ?? `${format(snapshot.massKg)} kg`;
    this.root.querySelector("#geo-rs").textContent = this.unitFormatter?.formatDistance(snapshot.schwarzschildRadiusMetres) ?? `${format(snapshot.schwarzschildRadiusMetres)} m`;
    this.root.querySelector("#geo-energy-drift").textContent = format(snapshot.energyDrift);
    this.root.querySelector("#geo-angular-drift").textContent = format(snapshot.angularMomentumDrift);
    this.root.querySelector("#geo-normalization").textContent = format(snapshot.normalizationResidual);
    this.root.querySelector("#geo-substeps").textContent = snapshot.integrationSubsteps.toLocaleString(getLocale());
  }

  #validateTimeScale(value) {
    const error = this.root.querySelector("#time-scale-error");
    if (value === null) { error.hidden = true; return false; }
    if (!Number.isFinite(value) || value < MIN_TIME_SCALE || value > MAX_TIME_SCALE) {
      error.textContent = t("controls.timeScaleError", { minimum: MIN_TIME_SCALE, maximum: MAX_TIME_SCALE });
      error.hidden = false;
      return false;
    }
    this.runtime.setTimeScale(value);
    error.hidden = true;
    return true;
  }

  dispose() { this.unsubscribeLocale?.(); }
}
