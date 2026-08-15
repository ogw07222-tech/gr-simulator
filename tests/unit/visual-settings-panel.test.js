import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisualSettingsPanel } from "../../src/ui/index.js";
import { DEFAULT_METRES_PER_WORLD_UNIT, RenderScaleMode, RenderScaleTransform } from "../../src/rendering/index.js";

describe("VisualSettingsPanel", () => {
  let root;
  let particleRenderer;
  let grid;
  let massObject;
  let frameRateController;

  beforeEach(() => {
    document.body.innerHTML = '<aside id="visuals"></aside>';
    root = document.querySelector("#visuals");
    particleRenderer = { setAppearance: vi.fn(), getSpeedLegend: () => ({ minimum: 0, midpoint: 1, maximum: 2 }) };
    grid = { setAppearance: vi.fn(), getLegend: () => ({ rawMinimum: 0, rawMidpoint: 0.25, rawMaximum: 1 }) };
    massObject = { setAppearance: vi.fn() };
    frameRateController = { maxFps: 60, setMaxFps: vi.fn() };
    globalThis.localStorage.clear();
  });

  it("applies visual settings without simulation state", () => {
    new VisualSettingsPanel(root, { particleRenderer, grid, massObject, frameRateController });
    const size = root.querySelector("#particle-size");
    size.value = "16";
    size.dispatchEvent(new Event("input", { bubbles: true }));

    expect(particleRenderer.setAppearance).toHaveBeenLastCalledWith(expect.objectContaining({ particleSize: 16 }));
    expect(grid.setAppearance).toHaveBeenCalled();
    expect(massObject.setAppearance).toHaveBeenCalled();
  });

  it("restores documented visual defaults", () => {
    new VisualSettingsPanel(root, { particleRenderer, grid, massObject, frameRateController });
    const trailVisible = root.querySelector("#trail-visible");
    trailVisible.checked = false;
    trailVisible.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector("#reset-visuals").click();

    expect(root.querySelector("#particle-size").value).toBe("10");
    expect(root.querySelector("#particle-size").min).toBe("4");
    expect(root.querySelector("#particle-size").max).toBe("24");
    expect(root.querySelector("#trail-opacity").value).toBe("0.88");
    expect(root.querySelector("#trail-color-mode")).toBeNull();
    expect(root.textContent).toContain("Current particle speed");
    expect(trailVisible.checked).toBe(true);
  });

  it("resizes fixed trail buffers only when capacity changes", () => {
    const resize = vi.fn();
    new VisualSettingsPanel(root, {
      particleRenderer, grid, massObject,
      frameRateController,
      trailCapacity: { current: 512, options: [256, 512, 1024], resize },
    });
    root.querySelector("#trail-capacity").value = "1024";
    root.querySelector("#trail-capacity").dispatchEvent(new Event("change", { bubbles: true }));
    expect(resize).toHaveBeenCalledOnce();
    expect(resize).toHaveBeenCalledWith(1024);
  });

  it("applies FPS settings without touching simulation state", () => {
    new VisualSettingsPanel(root, { particleRenderer, grid, massObject, frameRateController });
    root.querySelector("#max-fps").value = "30";
    root.querySelector("#max-fps").dispatchEvent(new Event("change", { bubbles: true }));
    expect(frameRateController.setMaxFps).toHaveBeenLastCalledWith(30);
  });

  it("offers all scale modes, validates and persists physical scale settings", () => {
    const scaleTransform = new RenderScaleTransform();
    const fitPhysicalScene = vi.fn();
    const scaleIndicator = { setVisible: vi.fn() };
    new VisualSettingsPanel(root, {
      particleRenderer, grid, massObject, frameRateController,
      scaleTransform, fitPhysicalScene, scaleIndicator,
    });
    expect([...root.querySelector("#scale-mode").options].map((option) => option.value)).toEqual([
      RenderScaleMode.NORMALIZED, RenderScaleMode.PHYSICAL, RenderScaleMode.AUTO_FIT_PHYSICAL,
    ]);
    root.querySelector("#scale-mode").value = RenderScaleMode.PHYSICAL;
    root.querySelector("#scale-mode").dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector("#physical-scale").value = "2000000000";
    root.querySelector("#physical-scale").dispatchEvent(new Event("change", { bubbles: true }));
    expect(scaleTransform.mode).toBe(RenderScaleMode.PHYSICAL);
    expect(scaleTransform.metresPerWorldUnit).toBe(2e9);
    expect(JSON.parse(globalThis.localStorage.getItem("gr4d.renderScale"))).toMatchObject({
      scaleMode: RenderScaleMode.PHYSICAL, metresPerWorldUnit: 2e9,
    });
    root.querySelector("#physical-scale").value = "0";
    root.querySelector("#physical-scale").dispatchEvent(new Event("change", { bubbles: true }));
    expect(scaleTransform.metresPerWorldUnit).toBe(2e9);
  });

  it("restores scale defaults and invokes event-driven auto-fit", () => {
    const scaleTransform = new RenderScaleTransform();
    const fitPhysicalScene = vi.fn();
    new VisualSettingsPanel(root, {
      particleRenderer, grid, massObject, frameRateController,
      scaleTransform, fitPhysicalScene, scaleIndicator: { setVisible() {} },
    });
    root.querySelector("#scale-mode").value = RenderScaleMode.AUTO_FIT_PHYSICAL;
    root.querySelector("#scale-mode").dispatchEvent(new Event("change", { bubbles: true }));
    expect(fitPhysicalScene).toHaveBeenCalledOnce();
    root.querySelector("#scale-increase").click();
    expect(fitPhysicalScene).toHaveBeenCalledTimes(2);
    root.querySelector("#reset-scale").click();
    expect(scaleTransform.mode).toBe(RenderScaleMode.NORMALIZED);
    expect(scaleTransform.metresPerWorldUnit).toBe(DEFAULT_METRES_PER_WORLD_UNIT);
  });

  it("offers bounded presentation-only grid deformation gains", () => {
    const onGridDeformationGain = vi.fn();
    new VisualSettingsPanel(root, {
      particleRenderer, grid, massObject, frameRateController, onGridDeformationGain,
    });
    const gain = root.querySelector("#grid-deformation-gain");
    expect([...gain.options].map((option) => option.value)).toEqual(["1", "2", "3", "5", "10"]);
    expect(gain.value).toBe("1");
    gain.value = "5";
    gain.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onGridDeformationGain).toHaveBeenCalledOnce();
    expect(onGridDeformationGain).toHaveBeenCalledWith(5);
    expect(root.querySelector('[data-help-key="gridDeformationGain"]')).not.toBeNull();
  });

  it("exposes localized particle focus and follow without duplicating camera state", () => {
    const particleCamera = { focus: vi.fn(() => true), setFollow: vi.fn(() => true) };
    const panel = new VisualSettingsPanel(root, {
      particleRenderer, grid, massObject, frameRateController,
      scaleTransform: new RenderScaleTransform(), scaleIndicator: { setVisible() {} }, particleCamera,
    });
    expect(root.querySelector("#focus-particle").textContent).toBe("Focus Particle");
    panel.setParticleTrackingAvailable(true);
    root.querySelector("#focus-particle").click();
    root.querySelector("#follow-particle").click();
    expect(particleCamera.focus).toHaveBeenCalledOnce();
    expect(particleCamera.setFollow).toHaveBeenCalledWith(true);
    panel.setParticleTrackingAvailable(false);
    expect(particleCamera.setFollow).toHaveBeenLastCalledWith(false);
    expect(root.querySelector("#focus-particle").disabled).toBe(true);
  });
});
