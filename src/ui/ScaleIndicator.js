import { formatDistanceKilometres, formatMetresPerWorldUnit } from "../rendering/index.js";
import { getLocale, subscribeLocale, t } from "./i18n.js";

export class ScaleIndicator {
  constructor(root, transform) {
    this.root = root;
    this.transform = transform;
    this.snapshot = null;
    this.lastRefresh = 0;
    this.visible = true;
    this.comparisonVisible = false;
    this.previousMass = 0;
    this.previousRadius = 0;
    this.currentMass = 0;
    this.currentRadius = 0;
    this.normalizedOrbitRadius = 0;
    this.element = document.createElement("aside");
    this.element.className = "scale-indicator";
    this.element.setAttribute("aria-live", "polite");
    root.append(this.element);
    this.unsubscribeLocale = subscribeLocale(() => this.render());
    this.render();
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.element.hidden = !this.visible;
  }

  update(snapshot, force = false) {
    if (!snapshot) return;
    const now = globalThis.performance.now();
    if (!force && now - this.lastRefresh < 100) return;
    this.snapshot = snapshot;
    this.lastRefresh = now;
    this.render();
  }

  recordApplied(previous, current) {
    if (!previous || !current || previous.massSolar === current.massSolar) return;
    this.previousMass = previous.massSolar;
    this.previousRadius = previous.schwarzschildRadiusMetres;
    this.currentMass = current.massSolar;
    this.currentRadius = current.schwarzschildRadiusMetres;
    this.normalizedOrbitRadius = current.radiusRs;
    this.comparisonVisible = true;
    this.render();
  }

  resetComparison() {
    this.comparisonVisible = false;
    this.render();
  }

  render() {
    if (!this.snapshot) {
      this.element.innerHTML = `<strong data-scale-mode>${t(`scale.mode.${this.transform.mode}`)}</strong>`;
      return;
    }
    const locale = getLocale();
    const snapshot = this.snapshot;
    const physical = this.transform.isPhysical();
    const worldUnit = physical
      ? formatMetresPerWorldUnit(this.transform.metresPerWorldUnit, locale)
      : t("scale.oneWorldUnitNormalized");
    const horizonKm = formatDistanceKilometres(snapshot.schwarzschildRadiusMetres / 1000, locale);
    const particleKm = formatDistanceKilometres(snapshot.radiusMetres / 1000, locale);
    this.element.innerHTML = `<strong data-scale-mode>${t(`scale.mode.${this.transform.mode}`)}</strong>
      <dl><div><dt>${t("scale.worldUnit")}</dt><dd>${worldUnit}</dd></div>
      <div><dt>${t("scale.schwarzschildRadius")}</dt><dd>${horizonKm}</dd></div>
      <div><dt>${t("scale.particleRadius")}</dt><dd>${snapshot.radiusRs.toFixed(3)} rₛ · ${particleKm}</dd></div>
      <div><dt>${t("scale.horizonRenderRadius")}</dt><dd>${this.transform.horizonRenderRadius().toFixed(4)}</dd></div></dl>
      ${this.comparisonVisible ? this.#comparison(locale) : ""}`;
    this.element.querySelector("[data-dismiss-comparison]")?.addEventListener("click", () => this.resetComparison());
    this.element.hidden = !this.visible;
  }

  #comparison(locale) {
    const growth = this.previousRadius > 0 ? this.currentRadius / this.previousRadius : 1;
    const language = locale === "ko" ? "ko-KR" : "en-US";
    return `<section class="scale-comparison"><header><strong>${t("scale.comparison")}</strong><button data-dismiss-comparison type="button" aria-label="${t("scale.dismissComparison")}">×</button></header>
      <p>${t("scale.massComparison", { previous: this.previousMass.toExponential(2), current: this.currentMass.toExponential(2) })}</p>
      <p>${t("scale.radiusComparison", { previous: formatDistanceKilometres(this.previousRadius / 1000, locale), current: formatDistanceKilometres(this.currentRadius / 1000, locale) })}</p>
      <p>${t("scale.growthFactor", { value: growth.toLocaleString(language, { maximumFractionDigits: 3 }) })}</p>
      <p>${t("scale.normalizedOrbitValue", { value: this.normalizedOrbitRadius.toFixed(2) })}</p></section>`;
  }

  dispose() { this.unsubscribeLocale?.(); this.element.remove(); }
}
