import { VERSION } from "../core/constants.js";

export class ControlPanel {
  constructor(root, store, model, grid) {
    this.root = root;
    this.store = store;
    this.model = model;
    this.grid = grid;
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
      <div class="notice"><strong>물리 범위</strong><br/>완전한 3+1D Einstein 방정식 해가 아닌, Schwarzschild 계량 기반 교육용 시각화입니다.</div>
    `;
  }

  bind() {
    this.root.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => this.store.setState({ mode: button.dataset.mode }));
    });
    this.root.querySelector("#mass").addEventListener("input", (event) => this.store.setState({ mass: Number(event.target.value) }));
    this.root.querySelector("#w").addEventListener("input", (event) => this.store.setState({ w: Number(event.target.value) }));
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

  dispose() { this.unsubscribe?.(); }
}
