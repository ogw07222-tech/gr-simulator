import { VERSION } from "../core/constants.js";
import { getLocale, setLocale, subscribeLocale, t } from "./i18n.js";

export class AppShell {
  constructor(root, { resetCamera }) {
    this.root = root;
    this.resetCamera = resetCamera;
    this.activeDrawer = null;
    this.panelsHidden = false;
    this.elapsedStatusTime = 0;
    this.lastFrameTime = null;
    this.paused = false;
    this.render();
    this.bind();
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
    this.localize();
  }

  render() {
    this.root.querySelector("#top-bar").innerHTML = `
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true"></span>
        <div><span class="eyebrow" data-i18n="app.eyebrow"></span><h1>GR-4D Simulator</h1></div>
        <span class="version-chip">v${VERSION}</span>
      </div>
      <div class="top-status" aria-live="polite">
        <span id="top-runtime-state" class="status-badge"><i></i><span id="top-runtime-label"></span></span>
        <span class="telemetry"><small>FPS</small><strong id="fps-value">--</strong></span>
        <span class="telemetry"><small data-i18n="status.frame"></small><strong id="frame-time-value">-- ms</strong></span>
      </div>
      <nav class="top-actions" data-i18n-aria="camera.viewportTools">
        <button id="open-simulation" class="mobile-only" type="button" data-i18n="panels.simulation"></button>
        <button id="open-visuals" class="mobile-only" type="button" data-i18n="panels.visualsShort"></button>
        <label class="locale-control"><span class="sr-only" data-i18n="language.label"></span><select id="locale-select" data-i18n-aria="language.label">
          <option value="ko" data-i18n="language.ko"></option><option value="en" data-i18n="language.en"></option>
        </select></label>
        <button id="reset-camera" type="button" data-i18n="camera.reset" data-i18n-aria="camera.reset"></button>
        <button id="fullscreen" type="button" data-i18n="camera.fullscreen" data-i18n-aria="camera.toggleFullscreen"></button>
        <button id="toggle-panels" type="button"></button>
      </nav>
    `;
  }

  localize() {
    this.root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    this.root.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
    });
    this.root.querySelector("#locale-select").value = getLocale();
    this.root.querySelector("#top-runtime-label").textContent = t(this.paused ? "status.paused" : "status.running");
    const panelKey = this.panelsHidden ? "panels.show" : "panels.hide";
    const panelButton = this.root.querySelector("#toggle-panels");
    panelButton.textContent = t(panelKey);
    panelButton.setAttribute("aria-label", t(panelKey));
  }

  bind() {
    this.handleKeydown = (event) => {
      if (event.key === "Escape") this.closeDrawers();
    };
    this.root.querySelector("#reset-camera").addEventListener("click", this.resetCamera);
    this.root.querySelector("#locale-select").addEventListener("change", (event) => setLocale(event.target.value));
    this.root.querySelector("#fullscreen").addEventListener("click", () => this.toggleFullscreen());
    this.root.querySelector("#toggle-panels").addEventListener("click", () => this.togglePanels());
    this.root.querySelector("#open-simulation").addEventListener("click", () => this.openDrawer("simulation"));
    this.root.querySelector("#open-visuals").addEventListener("click", () => this.openDrawer("visuals"));
    this.root.querySelector("#panel-backdrop").addEventListener("click", () => this.closeDrawers());
    this.root.querySelectorAll("[data-close-panel]").forEach((button) => {
      button.addEventListener("click", () => this.closeDrawers());
    });
    document.addEventListener("keydown", this.handleKeydown);
  }

  update(renderDelta, runtimeState) {
    this.elapsedStatusTime += renderDelta;
    if (this.elapsedStatusTime < 0.25) return;

    const frameTime = renderDelta * 1000;
    const fps = renderDelta > 0 ? Math.round(1 / renderDelta) : 0;
    const paused = runtimeState.paused;
    this.paused = paused;
    const stateElement = this.root.querySelector("#top-runtime-state");
    stateElement.classList.toggle("paused", paused);
    this.root.querySelector("#top-runtime-label").textContent = t(paused ? "status.paused" : "status.running");
    this.root.querySelector("#fps-value").textContent = fps;
    this.root.querySelector("#frame-time-value").textContent = `${frameTime.toFixed(1)} ms`;
    this.elapsedStatusTime = 0;
    this.lastFrameTime = frameTime;
  }

  openDrawer(name) {
    this.drawerTrigger = document.activeElement;
    this.activeDrawer = name;
    this.root.dataset.drawer = name;
    this.root.querySelector("#panel-backdrop").hidden = false;
    const panel = this.root.querySelector(name === "simulation" ? "#control-panel" : "#visual-settings-panel");
    panel.tabIndex = -1;
    window.setTimeout(() => panel.focus({ preventScroll: true }), 220);
  }

  closeDrawers() {
    this.activeDrawer = null;
    delete this.root.dataset.drawer;
    this.root.querySelector("#panel-backdrop").hidden = true;
    this.drawerTrigger?.focus();
    this.drawerTrigger = null;
  }

  togglePanels() {
    this.panelsHidden = !this.panelsHidden;
    this.root.classList.toggle("panels-hidden", this.panelsHidden);
    const button = this.root.querySelector("#toggle-panels");
    button.textContent = t(this.panelsHidden ? "panels.show" : "panels.hide");
    button.setAttribute("aria-label", button.textContent);
  }

  async toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await this.root.requestFullscreen();
  }

  dispose() {
    this.unsubscribeLocale?.();
    document.removeEventListener("keydown", this.handleKeydown);
  }
}
