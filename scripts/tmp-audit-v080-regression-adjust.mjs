import fs from "node:fs";

const path = "tests/physics/runtime-stepping-audit.test.js";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  ["  createConstantsInitialCondition,\n", ""],
  [
    "const second = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100 });",
    "const second = new SchwarzschildNullGeodesicSystem({ units, maximumRadius: 100, maximumAffineStep: 0.02 / 3 });",
  ],
  [
    `    const eccentric = timelikeSubsystem(massSolar, {
      preset: "constants", radius: 6, energy: 0.97, angularMomentum: 2, radialDirection: -1, maximumSubsteps: 128,
    });`,
    `    const eccentric = timelikeSubsystem(massSolar, {
      preset: "precession", eccentricity: 0.3, maximumSubsteps: 128,
    });`,
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Missing regression adjustment target: ${before.slice(0, 80)}`);
  source = source.replace(before, after);
}

fs.writeFileSync(path, source);
