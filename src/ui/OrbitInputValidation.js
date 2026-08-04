export function validateOrbitConfiguration(configuration) {
  if (!(configuration.massSolar >= 1 && configuration.massSolar <= 1e10)) return "orbit.errorMass";
  if (!(configuration.radius > 1 && configuration.radius <= 10)) return "orbit.errorRadius";
  if (configuration.preset === "circular" && !(configuration.radius > 1.5)) return "orbit.errorCircularRadius";
  const speedSquared = configuration.radialBeta ** 2 + configuration.tangentialBeta ** 2;
  if (configuration.preset === "local" && !(speedSquared < 1)) return "orbit.errorVelocity";
  if (!Number.isInteger(configuration.maximumSubsteps)
    || configuration.maximumSubsteps < 1 || configuration.maximumSubsteps > 4096) return "orbit.errorSubsteps";
  return null;
}
