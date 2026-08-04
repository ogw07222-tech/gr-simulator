import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScientificHelp } from "../../src/ui/ScientificHelp.js";
import { setLocale } from "../../src/ui/i18n.js";

describe("ScientificHelp", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="root"><button data-help-key="mass" aria-expanded="false">?</button><button data-help-key="properTime" aria-expanded="false">?</button></main>';
    setLocale("en");
  });
  afterEach(() => { document.body.innerHTML = ""; });

  it("keeps one localized help popover active", () => {
    const help = new ScientificHelp(document.querySelector("#root"));
    const triggers = document.querySelectorAll("[data-help-key]");
    expect(triggers[0].getAttribute("aria-label")).toBe("Explain Black-hole mass");
    triggers[0].click();
    expect(document.querySelector(".scientific-help").textContent).toContain("Black-hole mass");
    expect(triggers[0].getAttribute("aria-expanded")).toBe("true");
    triggers[1].click();
    expect(triggers[0].getAttribute("aria-expanded")).toBe("false");
    expect(triggers[1].getAttribute("aria-expanded")).toBe("true");
    help.dispose();
  });

  it("closes with Escape and restores trigger focus", () => {
    const help = new ScientificHelp(document.querySelector("#root"));
    const trigger = document.querySelector("[data-help-key]");
    trigger.click();
    document.dispatchEvent(new globalThis.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".scientific-help").hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    help.dispose();
  });
});
