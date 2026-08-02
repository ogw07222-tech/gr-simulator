import { VERSION } from "../core/constants.js";
import { getUiText } from "./i18n.js";

export class AppShell {
  constructor(root, { resetCamera }, text = getUiText()) {
    this.root = root;
    this.resetCamera = resetCamera;
    this.text = text;
    this.activeDrawer = null;
    this.panelsHidden = false;
    this.elapsedStatusTime = 0;
    this.lastFrameTime = null;
    this.render();
    this.bind();
  }

  render() {
    const text = this.text.shell;
    this.root.querySelector("#top-bar").innerHTML = `
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true"></span>
        <div><span class="eyebrow">${text.eyebrow}</span><h1>GR-4D Simulator</h1></div>
        <span class="version-chip">v${VERSION}</span>
      </div>
      <div class="top-status" aria-live="polite">
        <span id="top-runtime-state" class="status-badge"><i></i> ${text.running}</span>
        <span class="telemetry"><small>FPS</small><strong id="fps-value">--</strong></span>
        <span class="telemetry"><small>${text.frame}</small><strong id="frame-time-value">-- ms</strong></span>
      </div>
      <nav class="top-actions" aria-label="${text.viewportTools}">
        <button id="open-simulation" class="mobile-only" type="button">${text.simulation}</button>
        <button id="open-visuals" class="mobile-only" type="button">${text.visualSettings}</button>
        <button id="reset-camera" type="button" aria-label="${text.resetCamera}">${text.resetCamera}</button>
        <button id="fullscreen" type="button" aria-label="${text.toggleFullscreen}">${text.fullscreen}</button>
        <button id="toggle-panels" type="button" aria-label="${text.hidePanels}">${text.hidePanels}</button>
      </nav>
    `;
    this.localizeStaticShell(text);
  }

  localizeStaticShell(text) {
    const entries = {
      "active-model-label": text.activeModel, "active-model-name": text.modelName,
      "orbit-hint": text.orbitHint, "pan-hint": text.panHint, "zoom-hint": text.zoomHint,
      "renderer-status": text.rendererOnline, "fixed-step-label": text.fixedStep,
      "camera-label": text.camera, "camera-controls": text.orbitControls, "status-note": text.scope,
    };
    Object.entries(entries).forEach(([id, value]) => { this.root.querySelector(`#${id}`).textContent = value; });
    this.root.querySelector("#viewport").setAttribute("aria-label", text.viewport);
    this.root.querySelector("#panel-backdrop").setAttribute("aria-label", text.closeOpenPanel);
  }

  bind() {
    this.handleKeydown = (event) => {
      if (event.key === "Escape") this.closeDrawers();
    };
    this.root.querySelector("#reset-camera").addEventListener("click", this.resetCamera);
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
    const stateElement = this.root.querySelector("#top-runtime-state");
    stateElement.classList.toggle("paused", paused);
    stateElement.lastChild.textContent = paused ? ` ${this.text.shell.paused}` : ` ${this.text.shell.running}`;
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
    button.textContent = this.panelsHidden ? this.text.shell.showPanels : this.text.shell.hidePanels;
    button.setAttribute("aria-label", button.textContent);
  }

  async toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await this.root.requestFullscreen();
  }

  dispose() {
    document.removeEventListener("keydown", this.handleKeydown);
  }
}
