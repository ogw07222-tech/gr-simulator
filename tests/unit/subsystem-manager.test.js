import { describe, expect, it, vi } from "vitest";
import { SubsystemManager } from "../../src/systems/SubsystemManager.js";

describe("SubsystemManager", () => {
  it("automatically registers constructor subsystems and initializes by order", () => {
    const calls = [];
    const late = { order: 20, initialize: () => calls.push("late") };
    const early = { order: 10, initialize: () => calls.push("early") };
    const manager = new SubsystemManager([late, early]);

    manager.initialize({});

    expect(calls).toEqual(["early", "late"]);
  });

  it("updates and renders subsystems in execution order", () => {
    const calls = [];
    const manager = new SubsystemManager([
      { order: 2, update: () => calls.push("update-2"), render: () => calls.push("render-2") },
      { order: 1, update: () => calls.push("update-1"), render: () => calls.push("render-1") },
    ]);
    manager.initialize({});

    manager.update(1 / 240, {}, {});
    manager.render(1 / 60, {}, {});

    expect(calls).toEqual(["update-1", "update-2", "render-1", "render-2"]);
  });

  it("passes lifecycle arguments without transforming them", () => {
    const update = vi.fn();
    const render = vi.fn();
    const state = {};
    const snapshot = {};
    const manager = new SubsystemManager([{ update, render }]);
    manager.initialize({});

    manager.update(0.1, state, snapshot);
    manager.render(0.2, state, snapshot);

    expect(update).toHaveBeenCalledWith(0.1, state, snapshot);
    expect(render).toHaveBeenCalledWith(0.2, state, snapshot);
  });

  it("disposes subsystems in reverse execution order exactly once", () => {
    const calls = [];
    const manager = new SubsystemManager([
      { order: 1, dispose: () => calls.push("first") },
      { order: 2, dispose: () => calls.push("second") },
    ]);
    manager.initialize({});

    manager.dispose();
    manager.dispose();

    expect(calls).toEqual(["second", "first"]);
  });

  it("rejects duplicate registration", () => {
    const subsystem = {};
    const manager = new SubsystemManager([subsystem]);

    expect(() => manager.register(subsystem)).toThrow("already registered");
  });

  it("continues disposing subsystems after a disposer fails", () => {
    const finalDisposer = vi.fn();
    const manager = new SubsystemManager([
      { dispose: finalDisposer },
      { dispose: () => { throw new Error("dispose failure"); } },
    ]);
    manager.initialize({});

    expect(() => manager.dispose()).toThrow(AggregateError);
    expect(finalDisposer).toHaveBeenCalledOnce();
  });
});
