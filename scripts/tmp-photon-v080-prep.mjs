import fs from "node:fs";

const versionTargets = [
  "src/core/constants.js",
  "index.html",
  "src/ui/i18n/en.js",
  "src/ui/i18n/ko.js",
  "tests/unit/i18n.test.js",
  "tests/e2e/app.smoke.spec.js",
];
for (const filename of versionTargets) {
  let source = fs.readFileSync(filename, "utf8");
  source = source.replaceAll("v0.7.11", "v0.8.0");
  if (filename === "src/core/constants.js") source = source.replace('VERSION = "0.7.11"', 'VERSION = "0.8.0"');
  fs.writeFileSync(filename, source);
}

{
  const filename = "README.md";
  let source = fs.readFileSync(filename, "utf8");
  source = source.replace(
    "A browser-based General Relativity visualization laboratory built with Three.js. Version 0.7.11 adds a screen-space Particle Inspector while preserving the v0.7 Schwarzschild physics, conserved quantities, and SI state.",
    "A browser-based General Relativity visualization laboratory built with Three.js. Version 0.8.0 adds validated Schwarzschild null geodesics, bounded photon bundles, photon inspection, numerical deflection diagnostics, and a compact Light Bending demo while preserving the existing timelike Schwarzschild solver.",
  );
  source = source.replace(
    "- Click/touch Particle Inspector with constant-pixel anchored readout and off-screen edge indicator\n",
    "- Click/touch Particle/Photon Inspector with constant-pixel anchored readout, off-screen edge indicator, and shared Focus behavior\n- True Schwarzschild null-geodesic photons with affine-parameter integration, null-condition diagnostics, bounded 1/8/32/64 bundles, and an absolute OFF kill switch\n- Numerical photon deflection measurement and an 8-ray Light Bending demo driven by actual null-geodesic integration (not ray tracing)\n",
  );
  source = source.replace(
    "- [Physics model](docs/PHYSICS.md)\n",
    "- [Physics model](docs/PHYSICS.md)\n- [Photon Foundation](docs/PHOTON_FOUNDATION.md)\n",
  );
  fs.writeFileSync(filename, source);
}

{
  const filename = "CHANGELOG.md";
  let source = fs.readFileSync(filename, "utf8");
  const entry = `### v0.8.0

- Added a true Schwarzschild null-geodesic solver using affine parameter rather than proper time, with \`ACTIVE\` / \`CAPTURED\` / \`ESCAPED\` states, conserved null quantities, and explicit null-condition diagnostics.
- Fixed the reference geometry at event horizon \`r = r_s\`, photon sphere \`r = 1.5 r_s\`, and critical impact parameter \`b_crit = (3√3/2) r_s\`; deterministic tests cover capture, scattering, near-critical strong deflection, and the unstable null circular orbit.
- Added numerical incoming/outgoing-direction deflection measurement and a weak-field regression against \`α ≈ 4GM/(bc²)\` without injecting the analytic angle into rendering.
- Added a default-OFF photon subsystem, compact 1/8/32/64 count control, fixed-size photon markers, bounded trails, shared Particle/Photon Inspector infrastructure, and zero recurring photon integration/trail/diagnostic/render-buffer work while OFF.
- Added an 8-ray Light Bending demo using independent validated null-geodesic integrations across captured and scattered impact parameters. This release does not implement per-pixel ray tracing, black-hole shadow synthesis, or image-space lensing.

`;
  if (!source.includes("### v0.8.0\n")) source = source.replace("## Unreleased\n\n", `## Unreleased\n\n${entry}`);
  fs.writeFileSync(filename, source);
}
