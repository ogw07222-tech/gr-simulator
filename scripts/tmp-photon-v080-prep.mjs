import fs from "node:fs";

function replaceRequired(filename, oldText, newText) {
  const source = fs.readFileSync(filename, "utf8");
  if (!source.includes(oldText)) throw new Error(`Missing release anchor in ${filename}: ${oldText.slice(0, 80)}`);
  fs.writeFileSync(filename, source.replace(oldText, newText));
}

replaceRequired("package.json", '"version": "0.7.11"', '"version": "0.8.0"');
{
  const filename = "package-lock.json";
  let source = fs.readFileSync(filename, "utf8");
  for (let index = 0; index < 2; index += 1) {
    if (!source.includes('"version": "0.7.11"')) throw new Error("package-lock release version anchor missing");
    source = source.replace('"version": "0.7.11"', '"version": "0.8.0"');
  }
  fs.writeFileSync(filename, source);
}

replaceRequired("src/core/constants.js", 'export const VERSION = "0.7.11";', 'export const VERSION = "0.8.0";');
replaceRequired("index.html", "GR-4D Simulator v0.7.11", "GR-4D Simulator v0.8.0");
for (const filename of ["src/ui/i18n/en.js", "src/ui/i18n/ko.js", "tests/unit/i18n.test.js", "tests/e2e/app.smoke.spec.js"]) {
  const source = fs.readFileSync(filename, "utf8");
  if (!source.includes("v0.7.11")) throw new Error(`Version anchor missing in ${filename}`);
  fs.writeFileSync(filename, source.replaceAll("v0.7.11", "v0.8.0"));
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
    "- Click/touch shared Particle/Photon Inspector with constant-pixel anchored readout, off-screen edge indicator, and Focus behavior\n- Schwarzschild null-geodesic photons evolved with affine parameter and explicit null-condition diagnostics\n- Bounded independent photon bundles with counts 1 / 8 / 32 / 64 and an absolute default-OFF recurring-work gate\n- Numerical photon deflection measurement plus an 8-ray Light Bending demo driven by actual null-geodesic integration\n",
  );
  source = source.replace(
    "- 한국어 / English: switch the complete interface language without resetting simulation, camera, or visual state\n",
    "- 한국어 / English: switch the complete interface language without resetting simulation, camera, or visual state\n- Photons OFF / ON: disable or enable the photon subsystem; OFF performs zero recurring photon integration, trail, diagnostic, and render-buffer work\n- Photon Count: when enabled, select a bounded independent bundle of 1, 8, 32, or 64 photons\n- Light Bending: launch the validated eight-ray Schwarzschild bending demonstration from the collapsed photon setup\n",
  );
  source = source.replace(
    "- [Physics model](docs/PHYSICS.md)\n",
    "- [Physics model](docs/PHYSICS.md)\n- [Photon Foundation](docs/PHOTON_FOUNDATION.md)\n",
  );
  const scopeAnchor = "The long-term goal is a reproducible, testable, performance-oriented GR simulation platform. Physical observables, educational proxies, and visual effects must remain separately named and validated. Numerical methods will be introduced only with reference cases, error bounds, and benchmark budgets.\n";
  source = source.replace(scopeAnchor, `${scopeAnchor}\nCurrent photon scope does not include per-pixel ray tracing, black-hole image/shadow synthesis, accretion-disk rendering, Einstein-ring image synthesis, Kerr spacetime, or WebGPU/WASM photon acceleration.\n`);
  fs.writeFileSync(filename, source);
}

{
  const filename = "CHANGELOG.md";
  let source = fs.readFileSync(filename, "utf8");
  const entry = `### v0.8.0\n\n- Added a true Schwarzschild null-geodesic solver using affine parameter rather than proper time, with \`ACTIVE\` / \`CAPTURED\` / \`ESCAPED\` states, conserved null quantities, and explicit null-condition diagnostics.\n- Fixed the reference geometry at event horizon \`r = 1.0 r_s\`, photon sphere \`r = 1.5 r_s\`, and critical impact parameter \`b_crit = (3√3/2) r_s\`; deterministic tests cover capture, scattering, near-critical strong deflection, and the unstable null circular orbit.\n- Added numerical incoming/outgoing-direction deflection measurement and a weak-field regression at \`b = 25 r_s\` against \`α ≈ 4GM/(bc²)\` without injecting the analytic angle into rendering.\n- Added a default-OFF photon subsystem, compact 1/8/32/64 count control, fixed-size photon markers, bounded trails, shared Particle/Photon Inspector infrastructure, and zero recurring photon integration/trajectory/trail/diagnostic/render-buffer work while OFF.\n- Added an eight-ray Light Bending demo using independent validated null-geodesic integrations at impact parameters \`[2.2, 2.45, 2.62, 2.8, 3.2, 4, 5, 6] r_s\`, preserving the validated demo maximum affine substep of \`0.005\`.\n- Scope remains intentionally bounded: no per-pixel ray tracing, black-hole image/shadow synthesis, accretion disk, Einstein-ring image synthesis, Kerr spacetime, or WebGPU/WASM photon acceleration.\n\n`;
  if (!source.includes("### v0.8.0\n")) {
    if (!source.includes("## Unreleased\n\n")) throw new Error("CHANGELOG Unreleased anchor missing");
    source = source.replace("## Unreleased\n\n", `## Unreleased\n\n${entry}`);
  }
  fs.writeFileSync(filename, source);
}

{
  const filename = "docs/PHYSICS.md";
  let source = fs.readFileSync(filename, "utf8");
  const section = `\n## v0.8 Schwarzschild photon foundation\n\nv0.8 adds a separate equatorial null-geodesic solver in the same fixed analytic Schwarzschild spacetime. It advances photons with an affine parameter, not proper time, and validates the event horizon at \`1.0 r_s\`, photon sphere at \`1.5 r_s\`, and critical impact parameter \`b_crit = (3√3/2) r_s\`. Capture, scattering, near-critical strong deflection, null-condition error, numerical deflection, bounded 1/8/32/64 bundles, the shared Photon Inspector, and the Light Bending demo are documented in \`PHOTON_FOUNDATION.md\`. The existing massive/timelike solver is unchanged.\n\nPhoton rendering remains trajectory visualization rather than per-pixel ray tracing or image synthesis. Kerr spacetime, accretion disks, Einstein-ring image synthesis, and WebGPU/WASM photon acceleration are outside v0.8.0 scope.\n`;
  if (!source.includes("## v0.8 Schwarzschild photon foundation")) source += section;
  fs.writeFileSync(filename, source);
}
