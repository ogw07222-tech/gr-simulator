import { subscribeLocale, t } from "./i18n.js";

const SECTIONS = ["quickStart", "workflows", "scaleViews", "examples", "integrator", "measurements", "scope"];

export class UserGuide {
  constructor(root) {
    this.root = root;
    this.dialog = document.createElement("section");
    this.dialog.className = "user-guide";
    this.dialog.hidden = true;
    this.dialog.setAttribute("role", "dialog");
    this.dialog.setAttribute("aria-modal", "true");
    root.append(this.dialog);
    this.unsubscribeLocale = subscribeLocale(() => this.render());
    this.onKeydown = (event) => this.#keydown(event);
    document.addEventListener("keydown", this.onKeydown);
    this.render();
  }

  render() {
    this.dialog.setAttribute("aria-label", t("guide.title"));
    this.dialog.innerHTML = `<header><div><span class="section-index">GUIDE</span><h2>${t("guide.title")}</h2></div><button data-guide-close type="button">${t("panels.close")}</button></header>
      <p class="guide-intro">${t("guide.intro")}</p>
      ${SECTIONS.map((key, index) => `<details class="guide-section" ${index === 0 ? "open" : ""}><summary>${t(`guide.${key}.title`)}</summary><div>${t(`guide.${key}.body`)}</div></details>`).join("")}`;
    this.dialog.querySelector("[data-guide-close]").addEventListener("click", () => this.close());
  }

  open(trigger) {
    this.trigger = trigger;
    this.dialog.hidden = false;
    this.root.classList.add("guide-open");
    this.dialog.querySelector("[data-guide-close]").focus({ preventScroll: true });
  }

  close() {
    if (this.dialog.hidden) return;
    this.dialog.hidden = true;
    this.root.classList.remove("guide-open");
    this.trigger?.focus();
    this.trigger = null;
  }

  #keydown(event) {
    if (this.dialog.hidden) return;
    if (event.key === "Escape") this.close();
    if (event.key !== "Tab") return;
    const focusable = [...this.dialog.querySelectorAll("button, summary")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  dispose() {
    document.removeEventListener("keydown", this.onKeydown);
    this.unsubscribeLocale?.();
    this.dialog.remove();
  }
}
