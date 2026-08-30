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

  it("defaults to English", async () => {
    const i18n = await loadI18n();
    expect(i18n.getLocale()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("restores a valid saved locale", async () => {
    const i18n = await loadI18n("ko");
    expect(i18n.getLocale()).toBe("ko");
    expect(document.documentElement.lang).toBe("ko");
  });

  it("falls back to English for an invalid saved locale", async () => {
    const i18n = await loadI18n("fr");
    expect(i18n.getLocale()).toBe("en");
  });

  it("returns Korean and English translations", async () => {
    const i18n = await loadI18n();
    expect(i18n.t("controls.play")).toBe("Play");
    i18n.setLocale("ko");
    expect(i18n.t("controls.play")).toBe("재생");
  });

  it("keeps locale dictionaries structurally complete", async () => {
    const i18n = await loadI18n();
    const keys = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof child === "string" ? [path] : keys(child, path);
    });
    expect(keys(i18n.messages.en).sort()).toEqual(keys(i18n.messages.ko).sort());
  });

  it("returns a deterministic marker for a missing key", async () => {
    const i18n = await loadI18n();
    expect(i18n.t("missing.key")).toBe("[missing.key]");
  });

  it("notifies subscribers and supports unsubscribe", async () => {
    const i18n = await loadI18n();
    const listener = vi.fn();
    const unsubscribe = i18n.subscribeLocale(listener);
    i18n.setLocale("ko");
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith("ko");
    unsubscribe();
    i18n.setLocale("en");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("updates document language and metadata", async () => {
    const i18n = await loadI18n();
    i18n.setLocale("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("GR-4D Simulator v0.8.0");
    expect(document.querySelector('meta[name="description"]').content).toContain("General Relativity");
  });

  it("persists locale changes", async () => {
    const i18n = await loadI18n();
    i18n.setLocale("ko");
    expect(globalThis.localStorage.getItem(i18n.STORAGE_KEY)).toBe("ko");
  });

  it("keeps editable locale data in one module per language", async () => {
    const [{ en }, { ko }] = await Promise.all([
      import("../../src/ui/i18n/en.js"),
      import("../../src/ui/i18n/ko.js"),
    ]);
    expect(en.controls.play).toBe("Play");
    expect(ko.controls.play).toBe("재생");
  });
});
