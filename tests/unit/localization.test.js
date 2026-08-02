import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, UI_LOCALES, getUiText } from "../../src/ui/i18n.js";

describe("UI localization", () => {
  it("uses Korean as the default locale", () => {
    expect(DEFAULT_LOCALE).toBe("ko");
    expect(getUiText()).toBe(UI_LOCALES.ko);
    expect(getUiText().shell.running).toBe("실행 중");
  });

  it("falls back to Korean for an unavailable locale", () => {
    expect(getUiText("en")).toBe(UI_LOCALES.ko);
  });
});
