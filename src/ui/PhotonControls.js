import { subscribeLocale, t } from "./i18n.js";

const PHOTON_COUNTS = [1, 8, 32, 64];

export class PhotonControls {
  constructor(root, {
    enabled = false,
    count = 1,
    onToggle = null,
    onCount = null,
    onPreset = null,
    onApply = null,
    onDemo = null,
    getConfiguration = null,
    getCount = null,
  } = {}) {
    this.root = root;
    this.enabled = Boolean(enabled);
    this.count = PHOTON_COUNTS.includes(count) ? count : 1;
    this.onToggle = onToggle;
    this.onCount = onCount;
    this.onPreset = onPreset;
    this.onApply = onApply;
    this.onDemo = onDemo;
    this.getConfiguration = getConfiguration;
    this.getCount = getCount;
    this.element = document.createElement("div");
    this.element.className = "photon-controls";
    this.element.innerHTML = `<div class="photon-controls-row"><span class="photon-controls-label"></span><button class="photon-toggle" type="button"></button><label class="photon-count-control" hidden><span data-role="count-label"></span><select class="photon-count"><option value="1">1</option><option value="8">8</option><option value="32">32</option><option value="64">64</option></select></label></div>
      <details class="photon-setup" hidden><summary data-role="setup-label"></summary><div class="photon-setup-body">
        <label><span data-role="preset-label"></span><select class="photon-preset"><option value="weak"></option><option value="strong"></option><option value="nearCritical"></option><option value="capture"></option></select></label>
        <button class="photon-demo" type="button"></button>
        <details class="photon-advanced"><summary data-role="advanced-label"></summary><div class="photon-advanced-grid">
<label><span data-role="radius-label"></span><input class="photon-radius" type="number" min="1.001" step="0.1"></label>
<label><span data-role="phi-label"></span><input class="photon-phi" type="number" step="0.01"></label>
<label><span data-role="impact-label"></span><input class="photon-impact" type="number" min="0" step="0.01"></label>
<label><span data-role="radial-label"></span><select class="photon-radial"><option value="-1"></option><option value="1"></option></select></label>
<label><span data-role="angular-label"></span><select class="photon-angular"><option value="1"></option><option value="-1"></option></select></label>
<button class="photon-apply" type="button"></button>
        </div></details>
      </div></details>`;
    this.button = this.element.querySelector(".photon-toggle");
    this.countControl = this.element.querySelector(".photon-count-control");
    this.countSelect = this.element.querySelector(".photon-count");
    this.setup = this.element.querySelector(".photon-setup");
    this.preset = this.element.querySelector(".photon-preset");
    this.demoButton = this.element.querySelector(".photon-demo");
    this.radius = this.element.querySelector(".photon-radius");
    this.phi = this.element.querySelector(".photon-phi");
    this.impact = this.element.querySelector(".photon-impact");
    this.radial = this.element.querySelector(".photon-radial");
    this.angular = this.element.querySelector(".photon-angular");
    this.applyButton = this.element.querySelector(".photon-apply");
    this.handleClick = () => { this.setEnabled(!this.enabled); this.onToggle?.(this.enabled); };
    this.handleCount = () => {
      const requested = Number(this.countSelect.value);
      const applied = this.onCount?.(requested);
      this.setCount(PHOTON_COUNTS.includes(applied) ? applied : requested);
    };
    this.handlePreset = () => { const configuration = this.onPreset?.(this.preset.value); if (configuration) this.setConfiguration(configuration); };
    this.handleApply = () => { const configuration = this.onApply?.({ preset: "custom", radius: Number(this.radius.value), phi: Number(this.phi.value), impactParameter: Number(this.impact.value), radialDirection: Number(this.radial.value), angularDirection: Number(this.angular.value) }); if (configuration) this.setConfiguration(configuration); };
    this.handleDemo = () => {
      const result = this.onDemo?.();
      if (result?.configuration) this.setConfiguration(result.configuration);
      if (PHOTON_COUNTS.includes(result?.count)) this.setCount(result.count);
    };
    this.button.addEventListener("click", this.handleClick);
    this.countSelect.addEventListener("change", this.handleCount);
    this.preset.addEventListener("change", this.handlePreset);
    this.demoButton.addEventListener("click", this.handleDemo);
    this.applyButton.addEventListener("click", this.handleApply);
    this.root.append(this.element);
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
    this.localize();
    this.setCount(this.getCount?.() ?? this.count);
    this.setEnabled(this.enabled);
    this.setConfiguration(this.getConfiguration?.());
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.button.setAttribute("aria-pressed", String(this.enabled));
    this.button.textContent = t(this.enabled ? "photon.controls.on" : "photon.controls.off");
    this.countControl.hidden = !this.enabled;
    this.setup.hidden = !this.enabled;
    return this.enabled;
  }

  setCount(count) {
    if (!PHOTON_COUNTS.includes(count)) return this.count;
    this.count = count;
    this.countSelect.value = String(count);
    return this.count;
  }

  setConfiguration(configuration) {
    if (!configuration) return;
    if (["weak", "strong", "nearCritical", "capture"].includes(configuration.preset)) this.preset.value = configuration.preset;
    this.radius.value = configuration.radius;
    this.phi.value = configuration.phi ?? 0;
    this.impact.value = configuration.impactParameter;
    this.radial.value = String(configuration.radialDirection);
    this.angular.value = String(configuration.angularDirection);
  }

  localize() {
    const q = (role) => this.element.querySelector(`[data-role="${role}"]`);
    this.element.querySelector(".photon-controls-label").textContent = t("photon.controls.title");
    q("count-label").textContent = t("photon.controls.count");
    q("setup-label").textContent = t("photon.controls.setup");
    q("preset-label").textContent = t("photon.controls.preset");
    q("advanced-label").textContent = t("photon.controls.advanced");
    q("radius-label").textContent = t("photon.controls.radius");
    q("phi-label").textContent = t("photon.controls.phi");
    q("impact-label").textContent = t("photon.controls.impactParameter");
    q("radial-label").textContent = t("photon.controls.radialDirection");
    q("angular-label").textContent = t("photon.controls.angularDirection");
    for (const option of this.preset.options) option.textContent = t(`photon.presets.${option.value}`);
    this.radial.options[0].textContent = t("photon.controls.inward");
    this.radial.options[1].textContent = t("photon.controls.outward");
    this.angular.options[0].textContent = t("photon.controls.counterclockwise");
    this.angular.options[1].textContent = t("photon.controls.clockwise");
    this.demoButton.textContent = t("photon.controls.lightBending");
    this.applyButton.textContent = t("photon.controls.apply");
    this.setEnabled(this.enabled);
  }

  dispose() {
    this.unsubscribeLocale?.();
    this.button.removeEventListener("click", this.handleClick);
    this.countSelect.removeEventListener("change", this.handleCount);
    this.preset.removeEventListener("change", this.handlePreset);
    this.demoButton.removeEventListener("click", this.handleDemo);
    this.applyButton.removeEventListener("click", this.handleApply);
    this.element.remove();
  }
}
