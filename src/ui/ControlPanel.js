import { VERSION } from "../core/constants.js";

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
    this.sync(store.getState());
  }

  render() {
    this.root.innerHTML = `
      <header><div><span class="eyebrow">GENERAL RELATIVITY LAB</span><h1>GR-4D Simulator</h1></div><b>v${VERSION}</b></header>
      <p class="scope">단일 Schwarzschild 질량의 공간 절편을 약한 장 근사로 시각화합니다.</p>
      <div class="mode-switch" role="group" aria-label="거리 모드">
        <button data-mode="GR">GR 3D</button><button data-mode="GR_W">GR + W</button>
      </div>
      <label>질량 M <output id="mass-value"></output><input id="mass" type="range" min="10" max="300" step="5" /></label>
      <label>W축 거리 <output id="w-value"></output><input id="w" type="range" min="0" max="6" step="0.05" /></label>
      <section class="metrics">
        <div><small>Schwarzschild rₛ</small><strong id="rs"></strong></div>
        <div><small>중심 lapse α</small><strong id="lapse"></strong></div>
        <div><small>곡률 proxy</small><strong id="curvature"></strong></div>
        <div><small>선분 정점</small><strong id="vertices"></strong></div>
      </section>
      ${this.runtime ? `
      <section class="runtime" aria-label="Runtime controls">
        <div class="runtime-actions">
          <button id="play" type="button">Play</button>
          <button id="pause" type="button">Pause</button>
        </div>
        <label>Time Scale
          <select id="time-scale" aria-label="Time Scale">
            ${this.runtime.timeScales.map((scale) => `<option value="${scale}">${scale}x</option>`).join("")}
          </select>
        </label>
        <div class="runtime-actions">
          <button id="reset-particle" type="button">Reset Particle</button>
          <button id="reset-all" type="button">Reset All</button>
        </div>
        <div class="runtime-status" aria-live="polite">
          <div><small>Status</small><strong id="runtime-state"></strong></div>
          <div><small>Simulation Time</small><strong id="simulation-time"></strong></div>
          <div><small>Time Scale</small><strong id="runtime-time-scale"></strong></div>
          <div><small>Particle Count</small><strong id="particle-count"></strong></div>
        </div>
      </section>` : ""}
      <div class="notice"><strong>물리 범위</strong><br/>완전한 3+1D Einstein 방정식 해가 아닌, Schwarzschild 계량 기반 교육용 시각화입니다.</div>
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
      this.root.querySelector("#runtime-state").textContent = state.paused ? "Paused" : "Running";
      this.root.querySelector("#play").disabled = !state.paused;
      this.root.querySelector("#pause").disabled = state.paused;
    }
    if (this.runtimeView.timeScale !== state.timeScale) {
      this.runtimeView.timeScale = state.timeScale;
      this.root.querySelector("#time-scale").value = state.timeScale;
      this.root.querySelector("#runtime-time-scale").textContent = `${state.timeScale}x`;
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
