import { performance } from "node:perf_hooks";
import process from "node:process";
import {
  SchwarzschildGeodesicSystem,
  SchwarzschildUnits,
  createCircularInitialCondition,
  solarMassesToKilograms,
} from "../src/physics/index.js";

const units = new SchwarzschildUnits(solarMassesToKilograms(4e6));
const counts = [1, 100, 1000];
const fixedUpdates = 240;

for (const count of counts) {
  const systems = Array.from({ length: count }, () => {
    const system = new SchwarzschildGeodesicSystem({ units });
    system.initialize(createCircularInitialCondition(6));
    return system;
  });
  const delta = 1 / 240;
  const start = performance.now();
  for (let update = 0; update < fixedUpdates; update += 1) {
    for (let index = 0; index < systems.length; index += 1) systems[index].advanceProperTimeSI(delta);
  }
  const elapsed = performance.now() - start;
  process.stdout.write(`${JSON.stringify({ particles: count, fixedUpdates, elapsedMs: elapsed, updateBudgetMs: elapsed / fixedUpdates })}\n`);
}
