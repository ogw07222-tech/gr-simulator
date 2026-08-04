import { en } from "./i18n/en.js";
import { ko } from "./i18n/ko.js";

const STORAGE_KEY = "gr4d.locale";
const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = Object.freeze(["en", "ko"]);
const messages = Object.freeze({ en, ko });
const listeners = new Set();

function readStoredLocale() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function resolveMessage(dictionary, key) {
  const segments = key.split(".");
  let value = dictionary;
  for (let index = 0; index < segments.length; index += 1) {
    value = value?.[segments[index]];
  }
  return typeof value === "string" ? value : null;
}

let locale = readStoredLocale();

function updateDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.title = t("app.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("app.description"));
}

export function getLocale() { return locale; }

export function setLocale(nextLocale) {
  const normalized = SUPPORTED_LOCALES.includes(nextLocale) ? nextLocale : DEFAULT_LOCALE;
  if (normalized === locale) {
    updateDocument();
    return locale;
  }
  locale = normalized;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, locale); } catch { /* Storage can be unavailable. */ }
  updateDocument();
  listeners.forEach((listener) => listener(locale));
  return locale;
}

export function t(key, replacements = null) {
  let value = resolveMessage(messages[locale], key)
    ?? resolveMessage(messages[DEFAULT_LOCALE], key)
    ?? `[${key}]`;
  if (replacements) {
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
  }
  return value;
}

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export { DEFAULT_LOCALE, STORAGE_KEY, SUPPORTED_LOCALES, messages };

updateDocument();
