import "./styles/main.css";
import { PHYSICS_DEFAULTS, SIMULATION_DEFAULTS } from "./core/constants.js";
import { Store } from "./core/store.js";
import { SchwarzschildModel } from "./physics/schwarzschild.js";
import { Renderer } from "./scene/Renderer.js";
import { VolumetricGrid } from "./scene/VolumetricGrid.js";
import { MassObject } from "./scene/MassObject.js";
import { ControlPanel } from "./ui/ControlPanel.js";

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
