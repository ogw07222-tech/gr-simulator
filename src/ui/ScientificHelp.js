import { subscribeLocale, t } from "./i18n.js";

export class ScientificHelp {
  constructor(root) {
    this.root = root;
    this.activeTrigger = null;
    this.popover = document.createElement("aside");
    this.popover.className = "scientific-help";
    this.popover.id = "scientific-help-popover";
    this.popover.setAttribute("role", "tooltip");
    this.popover.hidden = true;
    root.append(this.popover);
    this.onClick = (event) => this.#handleClick(event);
    this.onKeydown = (event) => this.#handleKeydown(event);
    document.addEventListener("click", this.onClick);
    document.addEventListener("keydown", this.onKeydown);
    this.unsubscribeLocale = subscribeLocale(() => this.#localize());
    this.#localize();
  }

  #handleClick(event) {
    const trigger = event.target.closest("[data-help-key]");
    if (trigger && this.root.contains(trigger)) {
      event.stopPropagation();
      this.activeTrigger === trigger ? this.close() : this.open(trigger);
      return;
    }
    if (!this.popover.contains(event.target)) this.close(false);
  }

  #handleKeydown(event) {
    if (event.key === "Escape" && !this.popover.hidden) {
      event.stopPropagation();
      this.close(true);
    }
  }

  open(trigger) {
    this.close(false);
    this.activeTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", this.popover.id);
    this.#refresh();
    this.popover.hidden = false;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(330, window.innerWidth - 24);
    this.popover.style.width = `${width}px`;
    this.popover.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    this.popover.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - this.popover.offsetHeight - 12)}px`;
  }

  #refresh() {
    if (!this.activeTrigger) return;
    const key = this.activeTrigger.dataset.helpKey;
    this.popover.innerHTML = `<strong>${t(`glossary.${key}.term`)}</strong><p>${t(`glossary.${key}.definition`)}</p>`;
  }

  #localize() {
    this.root.querySelectorAll("[data-help-key]").forEach((trigger) => {
      trigger.setAttribute("aria-label", t("help.explain", { term: t(`glossary.${trigger.dataset.helpKey}.term`) }));
    });
    this.#refresh();
  }

  close(restoreFocus = false) {
    if (!this.activeTrigger) return;
    const trigger = this.activeTrigger;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-describedby");
    this.activeTrigger = null;
    this.popover.hidden = true;
    if (restoreFocus) trigger.focus();
  }

  dispose() {
    document.removeEventListener("click", this.onClick);
    document.removeEventListener("keydown", this.onKeydown);
    this.unsubscribeLocale?.();
    this.popover.remove();
  }
}

export function helpButton(key) {
  return `<button class="help-trigger" type="button" data-help-key="${key}" aria-expanded="false">?</button>`;
}
