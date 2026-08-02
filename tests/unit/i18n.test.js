import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadI18n(storedLocale = null) {
  globalThis.localStorage.clear();
  if (storedLocale !== null) globalThis.localStorage.setItem("gr4d.locale", storedLocale);
  vi.resetModules();
  return import("../../src/ui/i18n.js");
}

describe("UI localization", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.head.innerHTML = '<meta name="description" content="">';
  });

  it("defaults to Korean", async () => {
    const i18n = await loadI18n();
    expect(i18n.getLocale()).toBe("ko");
    expect(document.documentElement.lang).toBe("ko");
  });

  it("restores a valid saved locale", async () => {
    const i18n = await loadI18n("en");
    expect(i18n.getLocale()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("falls back to Korean for an invalid saved locale", async () => {
    const i18n = await loadI18n("fr");
    expect(i18n.getLocale()).toBe("ko");
  });

  it("returns Korean and English translations", async () => {
    const i18n = await loadI18n();
    expect(i18n.t("controls.play")).toBe("재생");
    i18n.setLocale("en");
    expect(i18n.t("controls.play")).toBe("Play");
  });

  it("keeps locale dictionaries structurally complete", async () => {
    const i18n = await loadI18n();
    expect(Object.keys(i18n.messages.en).sort()).toEqual(Object.keys(i18n.messages.ko).sort());
  });

  it("returns a deterministic marker for a missing key", async () => {
    const i18n = await loadI18n();
    expect(i18n.t("missing.key")).toBe("[missing.key]");
  });

  it("notifies subscribers and supports unsubscribe", async () => {
    const i18n = await loadI18n();
    const listener = vi.fn();
    const unsubscribe = i18n.subscribeLocale(listener);
    i18n.setLocale("en");
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith("en");
    unsubscribe();
    i18n.setLocale("ko");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("updates document language and metadata", async () => {
    const i18n = await loadI18n();
    i18n.setLocale("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("GR-4D Simulator v0.6.0");
    expect(document.querySelector('meta[name="description"]').content).toContain("General Relativity");
  });

  it("persists locale changes", async () => {
    const i18n = await loadI18n();
    i18n.setLocale("en");
    expect(globalThis.localStorage.getItem(i18n.STORAGE_KEY)).toBe("en");
  });
});
