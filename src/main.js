import "./ui/main.css";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS, Store } from "./core/index.js";
import { SchwarzschildModel } from "./physics/index.js";
import { MassObject, Renderer, VolumetricGrid } from "./rendering/index.js";
import { ControlPanel } from "./ui/index.js";

const store = new Store(SIMULATION_DEFAULTS);
const model = new SchwarzschildModel(PHYSICS_DEFAULTS);
const renderer = new Renderer(document.querySelector("#viewport"));
const grid = new VolumetricGrid({ size: SIMULATION_DEFAULTS.gridSize, divisions: SIMULATION_DEFAULTS.gridDivisions });
const massObject = new MassObject();
renderer.add(grid.object);
renderer.add(massObject.group);

const panel = new ControlPanel(document.querySelector("#control-panel"), store, model, grid);
let state = store.getState();
const applyState = (nextState) => { state = nextState; grid.update(model, state); };
const unsubscribe = store.subscribe(applyState);
applyState(state);

let animationId;
function animate() {
  animationId = requestAnimationFrame(animate);
  massObject.update(model, state.mass);
  renderer.render();
}
animate();

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationId);
  unsubscribe();
  panel.dispose();
  grid.dispose();
  massObject.dispose();
  renderer.dispose();
});
