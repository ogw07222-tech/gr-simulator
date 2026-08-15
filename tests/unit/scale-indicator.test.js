import { afterEach, describe, expect, it } from "vitest";
import { RenderScaleMode, RenderScaleTransform } from "../../src/rendering/index.js";
import { ScaleIndicator } from "../../src/ui/index.js";
import { setLocale } from "../../src/ui/i18n.js";

const snapshot = Object.freeze({
  massSolar: 4e6,
  schwarzschildRadiusMetres: 11813357528.26751,
  radiusRs: 6,
  radiusMetres: 70880145169.60506,
});

describe("ScaleIndicator", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("displays authoritative normalized and physical values in both locales", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const transform = new RenderScaleTransform();
    transform.setSchwarzschildRadiusMetres(snapshot.schwarzschildRadiusMetres);
    const indicator = new ScaleIndicator(document.querySelector("#root"), transform);
    setLocale("en");
    indicator.update(snapshot, true);
    expect(indicator.element.textContent).toContain("Normalized View");
    expect(indicator.element.textContent).toContain("6.000 rₛ");
    transform.setMode(RenderScaleMode.PHYSICAL);
    indicator.update(snapshot, true);
    expect(indicator.element.textContent).toContain("Physical Scale View");
    expect(indicator.element.textContent).toContain(transform.horizonRenderRadius().toFixed(4));
    setLocale("ko");
    expect(indicator.element.textContent).toContain("실제 축척 보기");
    indicator.dispose();
  });

  it("keeps only one previous applied physical configuration", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const transform = new RenderScaleTransform();
    const indicator = new ScaleIndicator(document.querySelector("#root"), transform);
    indicator.update(snapshot, true);
    indicator.recordApplied(snapshot, { ...snapshot, massSolar: 8e6, schwarzschildRadiusMetres: snapshot.schwarzschildRadiusMetres * 2 });
    expect(indicator.element.textContent).toContain("2");
    indicator.element.querySelector("[data-dismiss-comparison]").click();
    expect(indicator.element.querySelector(".scale-comparison")).toBeNull();
    indicator.dispose();
  });
});
