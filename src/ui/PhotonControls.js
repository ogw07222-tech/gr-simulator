import { subscribeLocale, t } from "./i18n.js";

export class PhotonControls {
  constructor(root, { enabled = false, onToggle = null } = {}) {
    this.root = root;
    this.enabled = Boolean(enabled);
    this.onToggle = onToggle;
    this.element = document.createElement("div");
    this.element.className = "photon-controls";
    this.element.innerHTML = `<span class="photon-controls-label"></span><button class="photon-toggle" type="button"></button>`;
    this.label = this.element.querySelector(".photon-controls-label");
    this.button = this.element.querySelector(".photon-toggle");
    this.handleClick = () => {
      this.setEnabled(!this.enabled);
      this.onToggle?.(this.enabled);
    };
    this.button.addEventListener("click", this.handleClick);
    this.root.append(this.element);
    this.unsubscribeLocale = subscribeLocale(() => this.localize());
    this.localize();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.button.setAttribute("aria-pressed", String(this.enabled));
    this.button.textContent = t(this.enabled ? "photon.controls.on" : "photon.controls.off");
    return this.enabled;
  }

  localize() {
    this.label.textContent = t("photon.controls.title");
    this.setEnabled(this.enabled);
  }

  dispose() {
    this.unsubscribeLocale?.();
    this.button.removeEventListener("click", this.handleClick);
    this.element.remove();
  }
}
