export const RenderScaleMode = Object.freeze({
  NORMALIZED: "normalized",
  PHYSICAL: "physical",
  AUTO_FIT_PHYSICAL: "auto-fit-physical",
});

export const RENDER_SCALE_MODES = Object.freeze(Object.values(RenderScaleMode));

export function isPhysicalRenderScaleMode(mode) {
  return mode === RenderScaleMode.PHYSICAL || mode === RenderScaleMode.AUTO_FIT_PHYSICAL;
}
