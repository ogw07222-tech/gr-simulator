import * as THREE from "three";
import { getLocale, subscribeLocale, t } from "./i18n.js";

const POINTER_MOVE_TOLERANCE = 7;
const POINTER_MOVE_TOLERANCE_SQUARED = POINTER_MOVE_TOLERANCE ** 2;
const HIT_PADDING_CSS_PIXELS = 9;
const MINIMUM_HIT_RADIUS_CSS_PIXELS = 13;
const ANCHOR_OFFSET_CSS_PIXELS = 14;
const SAFE_EDGE_CSS_PIXELS = 14;
const DIRECTION_EPSILON = 1e-8;

function isFiniteVector(x, y, z) {
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}

export class ParticleInspector {
  constructor(root, {
    renderer,
    particleRenderer,
    particles,
    unitFormatter,
    snapshotParticleId = null,
    focusParticle = () => false,
  } = {}) {
    if (!root) throw new TypeError("ParticleInspector requires a viewport root.");
    if (!renderer?.camera || !renderer?.renderer?.domElement) throw new TypeError("ParticleInspector requires the active Renderer.");
    if (!particleRenderer || !particles) throw new TypeError("ParticleInspector requires particle rendering and manager state.");

    this.root = root;
    this.renderer = renderer;
    this.camera = renderer.camera;
    this.canvas = renderer.renderer.domElement;
    this.particleRenderer = particleRenderer;
    this.particles = particles;
    this.unitFormatter = unitFormatter;
    this.snapshotParticleId = snapshotParticleId;
    this.focusParticle = focusParticle;

    this.selectedId = null;
    this.selectedIndex = -1;
    this.pointerId = null;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.valuesDirty = true;
    this.cardSizeDirty = true;
    this.edgeSizeDirty = true;
    this.lastSnapshotRevision = -1;
    this.lastParticleRevision = -1;
    this.cardWidth = 250;
    this.cardHeight = 220;
    this.edgeWidth = 190;
    this.edgeHeight = 40;
    this.edgeBaseStatus = "";
    this.mode = "hidden";
    this.screenX = Number.NaN;
    this.screenY = Number.NaN;

    this.worldPosition = new THREE.Vector3();
    this.viewPosition = new THREE.Vector3();
    this.ndcPosition = new THREE.Vector3();
    this.projection = {
      projected: false,
      behind: false,
      inside: false,
      renderVisible: false,
      screenX: 0,
      screenY: 0,
      directionX: 0,
      directionY: 0,
    };
    this.lastText = Object.create(null);

    this.#render();
    this.#bind();
    this.unsubscribeLocale = subscribeLocale(() => {
      this.#createNumberFormatter();
      this.#localize();
      this.valuesDirty = true;
      this.cardSizeDirty = true;
      this.edgeSizeDirty = true;
    });
    this.unsubscribeUnits = unitFormatter?.subscribe(() => {
      this.valuesDirty = true;
      this.cardSizeDirty = true;
    });
    this.#createNumberFormatter();
    this.#localize();
  }

  #render() {
    this.layer = document.createElement("div");
    this.layer.className = "particle-inspector-layer";
    this.layer.innerHTML = `
      <section class="particle-inspector" hidden aria-live="polite" aria-atomic="false">
        <header>
          <div><span class="particle-inspector-kicker" data-i18n="inspector.title"></span><strong data-field="id"></strong></div>
          <button class="particle-inspector-close" type="button" data-i18n-aria="inspector.close" aria-label=""></button>
        </header>
        <div class="particle-inspector-model"><span data-i18n="inspector.physicsModel"></span><strong data-field="model"></strong></div>
        <dl class="particle-inspector-readout">
          <div><dt data-i18n="inspector.radius"></dt><dd data-field="radius"></dd></div>
          <div><dt data-i18n="inspector.localSpeed"></dt><dd data-field="speed"></dd></div>
          <div><dt data-i18n="inspector.properTime"></dt><dd data-field="properTime"></dd></div>
          <div><dt data-i18n="inspector.coordinateTime"></dt><dd data-field="coordinateTime"></dd></div>
          <div><dt data-i18n="inspector.classification"></dt><dd data-field="classification"></dd></div>
        </dl>
        <details class="particle-inspector-details">
          <summary data-i18n="inspector.details"></summary>
          <dl class="particle-inspector-readout particle-inspector-advanced">
            <div><dt data-i18n="inspector.specificEnergy"></dt><dd data-field="energy"></dd></div>
            <div><dt data-i18n="inspector.angularMomentum"></dt><dd data-field="angularMomentum"></dd></div>
            <div><dt data-i18n="inspector.radialVelocity"></dt><dd data-field="radialVelocity"></dd></div>
            <div><dt data-i18n="inspector.tangentialVelocity"></dt><dd data-field="tangentialVelocity"></dd></div>
            <div><dt data-i18n="inspector.periapsis"></dt><dd data-field="periapsis"></dd></div>
            <div><dt data-i18n="inspector.apoapsis"></dt><dd data-field="apoapsis"></dd></div>
            <div><dt data-i18n="inspector.particleState"></dt><dd data-field="particleState"></dd></div>
            <div><dt data-i18n="inspector.integrationStatus"></dt><dd data-field="integrationStatus"></dd></div>
          </dl>
        </details>
      </section>
      <button class="particle-edge-indicator" type="button" hidden>
        <span class="particle-edge-arrow" aria-hidden="true">→</span>
        <span class="particle-edge-copy"><strong data-field="edgeId"></strong><small data-field="edgeStatus"></small></span>
      </button>
    `;
    this.root.appendChild(this.layer);
    this.card = this.layer.querySelector(".particle-inspector");
    this.closeButton = this.layer.querySelector(".particle-inspector-close");
    this.details = this.layer.querySelector(".particle-inspector-details");
    this.edge = this.layer.querySelector(".particle-edge-indicator");
    this.edgeArrow = this.layer.querySelector(".particle-edge-arrow");
    this.fields = Object.create(null);
    this.layer.querySelectorAll("[data-field]").forEach((element) => { this.fields[element.dataset.field] = element; });
  }

  #bind() {
    this.handlePointerDown = (event) => {
      if (!event.isPrimary || (event.pointerType !== "touch" && event.button !== 0)) return;
      this.pointerId = event.pointerId;
      this.pointerStartX = event.clientX;
      this.pointerStartY = event.clientY;
    };
    this.handlePointerUp = (event) => {
      if (this.pointerId !== event.pointerId) return;
      const dx = event.clientX - this.pointerStartX;
      const dy = event.clientY - this.pointerStartY;
      this.pointerId = null;
      if (dx * dx + dy * dy > POINTER_MOVE_TOLERANCE_SQUARED) return;
      const particle = this.#hitTest(event.clientX, event.clientY);
      if (particle) this.select(particle.id);
      else this.deselect();
    };
    this.handlePointerCancel = () => { this.pointerId = null; };
    this.handleResize = () => { this.cardSizeDirty = true; this.edgeSizeDirty = true; };
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    this.closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.deselect();
    });
    this.details.addEventListener("toggle", () => { this.cardSizeDirty = true; });
    this.edge.addEventListener("click", (event) => {
      event.stopPropagation();
      const position = this.#selectedRenderPosition();
      if (position) this.focusParticle(position.x, position.y, position.z);
    });
    window.addEventListener("resize", this.handleResize);
  }

  #createNumberFormatter() {
    this.numberFormatter = new Intl.NumberFormat(getLocale() === "ko" ? "ko-KR" : "en-US", {
      maximumSignificantDigits: 6,
      maximumFractionDigits: 6,
    });
  }

  #localize() {
    this.layer.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
    this.layer.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAria));
      if (element.classList.contains("particle-inspector-close")) element.textContent = "×";
    });
    if (this.selectedId !== null) this.edge.setAttribute("aria-label", t("inspector.focusSelected", { id: this.selectedId }));
  }

  select(id) {
    const particle = this.particles.findById(id);
    if (!particle) return null;
    this.selectedId = id;
    this.selectedIndex = this.#findParticleIndex(id);
    this.valuesDirty = true;
    this.cardSizeDirty = true;
    this.card.hidden = false;
    this.edge.hidden = true;
    this.edge.setAttribute("aria-label", t("inspector.focusSelected", { id }));
    return particle;
  }

  deselect() {
    this.selectedId = null;
    this.selectedIndex = -1;
    this.card.hidden = true;
    this.edge.hidden = true;
    this.mode = "hidden";
    this.screenX = Number.NaN;
    this.screenY = Number.NaN;
  }

  update(snapshot, snapshotRevision = 0, particleRevision = this.particles.revision()) {
    if (this.selectedId === null) return false;
    if (particleRevision !== this.lastParticleRevision) {
      if (this.selectedIndex < 0 || this.particles.particleAt(this.selectedIndex)?.id !== this.selectedId) {
        this.selectedIndex = this.#findParticleIndex(this.selectedId);
      }
      if (this.selectedIndex < 0) { this.deselect(); return false; }
    }
    if (this.valuesDirty || snapshotRevision !== this.lastSnapshotRevision || particleRevision !== this.lastParticleRevision) {
      this.#syncValues(snapshot);
      this.valuesDirty = false;
      this.lastSnapshotRevision = snapshotRevision;
      this.lastParticleRevision = particleRevision;
    }
    this.#positionSelected();
    return true;
  }

  #syncValues(snapshot) {
    const particle = this.particles.particleAt(this.selectedIndex);
    if (!particle) return;
    const hasGeodesicSnapshot = this.selectedId === this.snapshotParticleId && snapshot;
    const unavailable = t("runtime.notAvailable");
    this.#write("id", t("inspector.identifierValue", { id: particle.id }));
    this.#write("model", t(hasGeodesicSnapshot ? "inspector.modelSchwarzschild" : "inspector.modelParticle"));
    this.#write("edgeId", t("inspector.identifierValue", { id: particle.id }));
    this.#write("radius", hasGeodesicSnapshot
      ? `${this.#number(snapshot.radiusRs)} rₛ · ${this.unitFormatter?.formatDistance(snapshot.radiusMetres) ?? unavailable}`
      : unavailable);
    this.#write("speed", hasGeodesicSnapshot
      ? `${this.#number(snapshot.localSpeedFraction)} c · ${this.unitFormatter?.formatVelocity(snapshot.localSpeedMetresPerSecond) ?? unavailable}`
      : unavailable);
    this.#write("properTime", hasGeodesicSnapshot ? this.unitFormatter?.formatTime(snapshot.properTime) ?? unavailable : unavailable);
    this.#write("coordinateTime", hasGeodesicSnapshot ? this.unitFormatter?.formatTime(snapshot.coordinateTime) ?? unavailable : unavailable);
    this.#write("classification", hasGeodesicSnapshot ? this.#translatedValue("orbit.classification", snapshot.orbitClassification) : unavailable);
    this.#write("energy", hasGeodesicSnapshot ? t("inspector.dimensionlessValue", { value: this.#number(snapshot.energy) }) : unavailable);
    this.#write("angularMomentum", hasGeodesicSnapshot ? t("inspector.dimensionlessValue", { value: this.#number(snapshot.angularMomentum) }) : unavailable);
    this.#write("radialVelocity", hasGeodesicSnapshot ? t("inspector.cFractionValue", { value: this.#number(snapshot.radialSpeedFraction) }) : unavailable);
    this.#write("tangentialVelocity", hasGeodesicSnapshot ? t("inspector.cFractionValue", { value: this.#number(snapshot.tangentialSpeedFraction) }) : unavailable);
    this.#write("periapsis", hasGeodesicSnapshot && Number.isFinite(snapshot.periapsisRadiusRs) ? `${this.#number(snapshot.periapsisRadiusRs)} rₛ` : unavailable);
    this.#write("apoapsis", hasGeodesicSnapshot && Number.isFinite(snapshot.apocenterRadiusRs) ? `${this.#number(snapshot.apocenterRadiusRs)} rₛ` : unavailable);
    this.#write("particleState", this.#translatedValue("inspector.state", particle.state));
    this.#write("integrationStatus", hasGeodesicSnapshot ? this.#translatedValue("orbit.status", snapshot.geodesicStatus) : unavailable);
    this.edgeBaseStatus = hasGeodesicSnapshot ? this.#translatedValue("orbit.classification", snapshot.orbitClassification) : this.#translatedValue("inspector.state", particle.state);
    this.#write("edgeStatus", this.edgeBaseStatus);
  }

  #translatedValue(prefix, value) {
    if (!value) return t("runtime.notAvailable");
    const translated = t(`${prefix}.${value}`);
    return translated.startsWith("[") ? String(value) : translated;
  }

  #number(value) {
    return Number.isFinite(value) ? this.numberFormatter.format(value) : t("runtime.notAvailable");
  }

  #write(field, value) {
    if (this.lastText[field] === value) return;
    this.lastText[field] = value;
    this.fields[field].textContent = value;
    if (field === "edgeId" || field === "edgeStatus") this.edgeSizeDirty = true;
  }

  #findParticleIndex(id) {
    for (let index = 0; index < this.particles.count(); index += 1) {
      if (this.particles.particleAt(index)?.id === id) return index;
    }
    return -1;
  }

  #selectedRenderPosition() {
    if (this.selectedIndex < 0) return null;
    const offset = this.selectedIndex * 3;
    const x = this.particleRenderer.positions[offset];
    const y = this.particleRenderer.positions[offset + 1];
    const z = this.particleRenderer.positions[offset + 2];
    if (!isFiniteVector(x, y, z)) return null;
    this.worldPosition.set(x, y, z);
    return this.worldPosition;
  }

  #projectRenderPosition(x, y, z, rect, target = this.projection) {
    target.projected = false;
    target.behind = false;
    target.inside = false;
    target.renderVisible = false;
    target.screenX = 0;
    target.screenY = 0;
    target.directionX = 0;
    target.directionY = 0;
    if (!isFiniteVector(x, y, z) || rect.width <= 0 || rect.height <= 0) return target;

    this.camera.updateMatrixWorld();
    this.worldPosition.set(x, y, z);
    this.viewPosition.copy(this.worldPosition).applyMatrix4(this.camera.matrixWorldInverse);
    if (this.viewPosition.z >= 0) {
      target.behind = true;
      target.directionX = this.viewPosition.x;
      target.directionY = -this.viewPosition.y;
      return target;
    }

    this.ndcPosition.copy(this.worldPosition).project(this.camera);
    if (!isFiniteVector(this.ndcPosition.x, this.ndcPosition.y, this.ndcPosition.z)) return target;
    target.projected = true;
    target.renderVisible = this.ndcPosition.z >= -1 && this.ndcPosition.z <= 1;
    target.screenX = (this.ndcPosition.x * 0.5 + 0.5) * rect.width;
    target.screenY = (-this.ndcPosition.y * 0.5 + 0.5) * rect.height;
    target.directionX = this.ndcPosition.x;
    target.directionY = -this.ndcPosition.y;
    target.inside = this.ndcPosition.x >= -1 && this.ndcPosition.x <= 1
      && this.ndcPosition.y >= -1 && this.ndcPosition.y <= 1;
    return target;
  }

  #positionSelected() {
    const position = this.#selectedRenderPosition();
    if (!position) { this.deselect(); return; }
    const canvasRect = this.canvas.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const projection = this.#projectRenderPosition(position.x, position.y, position.z, canvasRect);
    if (projection.projected && projection.inside) this.#positionCard(projection, canvasRect, rootRect);
    else this.#positionEdge(projection, canvasRect, rootRect);
  }

  #positionCard(projection, canvasRect, rootRect) {
    this.edge.hidden = true;
    this.card.hidden = false;
    if (this.cardSizeDirty) {
      this.cardWidth = this.card.offsetWidth || this.cardWidth;
      this.cardHeight = this.card.offsetHeight || this.cardHeight;
      this.cardSizeDirty = false;
    }
    const anchorX = canvasRect.left - rootRect.left + projection.screenX;
    const anchorY = canvasRect.top - rootRect.top + projection.screenY;
    const maximumLeft = Math.max(SAFE_EDGE_CSS_PIXELS, rootRect.width - this.cardWidth - SAFE_EDGE_CSS_PIXELS);
    const maximumTop = Math.max(SAFE_EDGE_CSS_PIXELS, rootRect.height - this.cardHeight - SAFE_EDGE_CSS_PIXELS);
    const left = Math.min(Math.max(anchorX + ANCHOR_OFFSET_CSS_PIXELS, SAFE_EDGE_CSS_PIXELS), maximumLeft);
    const top = Math.min(Math.max(anchorY - this.cardHeight * 0.5, SAFE_EDGE_CSS_PIXELS), maximumTop);
    this.card.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    this.mode = "anchored";
    this.screenX = anchorX;
    this.screenY = anchorY;
  }

  #positionEdge(projection, canvasRect, rootRect) {
    this.card.hidden = true;
    this.edge.hidden = false;
    const left = canvasRect.left - rootRect.left;
    const top = canvasRect.top - rootRect.top;
    const centerX = left + canvasRect.width * 0.5;
    const centerY = top + canvasRect.height * 0.5;
    let dx;
    let dy;
    if (projection.behind) {
      dx = projection.directionX;
      dy = projection.directionY;
      this.#write("edgeStatus", t("inspector.behindCamera"));
    } else if (projection.projected) {
      this.#write("edgeStatus", this.edgeBaseStatus);
      dx = projection.screenX - canvasRect.width * 0.5;
      dy = projection.screenY - canvasRect.height * 0.5;
    } else {
      dx = 0;
      dy = -1;
      this.#write("edgeStatus", t("inspector.outsideViewport"));
    }

    if (this.edgeSizeDirty) {
      this.edgeWidth = this.edge.offsetWidth || this.edgeWidth;
      this.edgeHeight = this.edge.offsetHeight || this.edgeHeight;
      this.edgeSizeDirty = false;
    }
    const hasDirection = Math.abs(dx) + Math.abs(dy) > DIRECTION_EPSILON;
    this.edgeArrow.hidden = !hasDirection;
    if (!hasDirection) { dx = 0; dy = -1; }
    const halfWidth = Math.max(1, canvasRect.width * 0.5 - this.edgeWidth * 0.5 - SAFE_EDGE_CSS_PIXELS);
    const halfHeight = Math.max(1, canvasRect.height * 0.5 - this.edgeHeight * 0.5 - SAFE_EDGE_CSS_PIXELS);
    const edgeScale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight, DIRECTION_EPSILON);
    const x = centerX + dx * edgeScale;
    const y = centerY + dy * edgeScale;
    this.edge.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%)`;
    if (hasDirection) this.edgeArrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    this.mode = projection.behind ? "behind" : "edge";
    this.screenX = x;
    this.screenY = y;
  }

  #hitTest(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hitRadius = Math.max(
      MINIMUM_HIT_RADIUS_CSS_PIXELS,
      this.particleRenderer.material.size * 0.5 + HIT_PADDING_CSS_PIXELS,
    );
    const hitRadiusSquared = hitRadius * hitRadius;
    let nearest = null;
    let nearestDistanceSquared = hitRadiusSquared;
    for (let index = 0; index < this.particles.count(); index += 1) {
      const offset = index * 3;
      const projection = this.#projectRenderPosition(
        this.particleRenderer.positions[offset],
        this.particleRenderer.positions[offset + 1],
        this.particleRenderer.positions[offset + 2],
        rect,
      );
      if (!projection.projected || !projection.inside || !projection.renderVisible) continue;
      const dx = projection.screenX - x;
      const dy = projection.screenY - y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > nearestDistanceSquared) continue;
      nearestDistanceSquared = distanceSquared;
      nearest = this.particles.particleAt(index);
    }
    return nearest;
  }

  getProjectedParticlePosition(id) {
    const index = this.#findParticleIndex(id);
    if (index < 0) return null;
    const rect = this.canvas.getBoundingClientRect();
    const offset = index * 3;
    const projection = this.#projectRenderPosition(
      this.particleRenderer.positions[offset],
      this.particleRenderer.positions[offset + 1],
      this.particleRenderer.positions[offset + 2],
      rect,
    );
    if (!projection.projected || !projection.inside) return null;
    return { x: rect.left + projection.screenX, y: rect.top + projection.screenY };
  }

  getDiagnostics() {
    return {
      selectedId: this.selectedId,
      mode: this.mode,
      cardWidth: this.card.hidden ? 0 : this.card.offsetWidth,
      cardHeight: this.card.hidden ? 0 : this.card.offsetHeight,
      screenX: this.screenX,
      screenY: this.screenY,
    };
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    window.removeEventListener("resize", this.handleResize);
    this.unsubscribeLocale?.();
    this.unsubscribeUnits?.();
    this.layer.remove();
  }
}
