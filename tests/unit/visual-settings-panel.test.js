import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisualSettingsPanel } from "../../src/ui/index.js";

describe("VisualSettingsPanel", () => {
  let root;
  let particleRenderer;
  let grid;
  let massObject;

  beforeEach(() => {
    document.body.innerHTML = '<aside id="visuals"></aside>';
    root = document.querySelector("#visuals");
    particleRenderer = { setAppearance: vi.fn() };
    grid = { setAppearance: vi.fn() };
    massObject = { setAppearance: vi.fn() };
  });

  it("applies visual settings without simulation state", () => {
    new VisualSettingsPanel(root, { particleRenderer, grid, massObject });
    const size = root.querySelector("#particle-size");
    size.value = "0.6";
    size.dispatchEvent(new Event("input", { bubbles: true }));

    expect(particleRenderer.setAppearance).toHaveBeenLastCalledWith(expect.objectContaining({ particleSize: 0.6 }));
    expect(grid.setAppearance).toHaveBeenCalled();
    expect(massObject.setAppearance).toHaveBeenCalled();
  });

  it("restores documented visual defaults", () => {
    new VisualSettingsPanel(root, { particleRenderer, grid, massObject });
    const trailVisible = root.querySelector("#trail-visible");
    trailVisible.checked = false;
    trailVisible.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector("#reset-visuals").click();

    expect(root.querySelector("#particle-size").value).toBe("0.36");
    expect(root.querySelector("#trail-opacity").value).toBe("0.88");
    expect(root.querySelector("#trail-color-mode").value).toBe("single");
    expect(trailVisible.checked).toBe(true);
  });
});
