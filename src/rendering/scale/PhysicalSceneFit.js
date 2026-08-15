export function calculatePhysicalSceneFit(target, {
  sceneExtent, safetyMargin = 1.25, verticalFovRadians, aspect,
}) {
  if (!target || !Number.isFinite(sceneExtent) || sceneExtent <= 0
    || !Number.isFinite(verticalFovRadians) || verticalFovRadians <= 0
    || !Number.isFinite(aspect) || aspect <= 0) return false;
  const extent = sceneExtent * Math.max(1, safetyMargin);
  const verticalDistance = extent / Math.tan(verticalFovRadians * 0.5);
  const horizontalDistance = verticalDistance / Math.max(aspect, 0.25);
  const distance = Math.max(verticalDistance, horizontalDistance, extent * 1.1);
  target.extent = extent;
  target.distance = distance;
  target.near = Math.max(0.001, Math.min(extent / 1000, distance / 100));
  target.far = Math.max(distance + extent * 4, target.near * 100);
  return true;
}
