import { VERSION } from "../core/constants.js";

export class AppShell {
  constructor(root, { resetCamera }) {
    this.root = root;
    this.resetCamera = resetCamera;
    this.activeDrawer = null;
    this.panelsHidden = false;
    this.elapsedStatusTime = 0;
    this.lastFrameTime = null;
    this.render();
    this.bind();
  }

  render() {
    this.root.querySelector("#top-bar").innerHTML = `
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true"></span>
        <div><span class="eyebrow">RELATIVITY RESEARCH CONSOLE</span><h1>GR-4D Simulator</h1></div>
        <span class="version-chip">v${VERSION}</span>
      </div>
      <div class="top-status" aria-live="polite">
        <span id="top-runtime-state" class="status-badge"><i></i> Running</span>
        <span class="telemetry"><small>FPS</small><strong id="fps-value">--</strong></span>
        <span class="telemetry"><small>FRAME</small><strong id="frame-time-value">-- ms</strong></span>
      </div>
      <nav class="top-actions" aria-label="Viewport tools">
        <button id="open-simulation" class="mobile-only" type="button">Simulation</button>
        <button id="open-visuals" class="mobile-only" type="button">Visuals</button>
        <button id="reset-camera" type="button" aria-label="Reset camera">Reset Camera</button>
        <button id="fullscreen" type="button" aria-label="Toggle fullscreen">Fullscreen</button>
        <button id="toggle-panels" type="button" aria-label="Hide side panels">Hide Panels</button>
      </nav>
    `;
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
    stateElement.lastChild.textContent = paused ? " Paused" : " Running";
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
    button.textContent = this.panelsHidden ? "Show Panels" : "Hide Panels";
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
