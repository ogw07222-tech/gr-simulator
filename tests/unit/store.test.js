import { describe, expect, it, vi } from "vitest";
import { Store } from "../../src/core/store.js";

describe("Store", () => {
  it("copies the initial state", () => {
    const initialState = { mass: 120, nested: { enabled: true } };
    const store = new Store(initialState);

    initialState.nested.enabled = false;

    expect(store.getState()).toEqual({ mass: 120, nested: { enabled: true } });
  });

  it("does not expose internal state through getState", () => {
    const store = new Store({ nested: { value: 1 } });
    const snapshot = store.getState();

    snapshot.nested.value = 2;

    expect(store.getState().nested.value).toBe(1);
  });

  it("merges state patches", () => {
    const store = new Store({ mass: 120, mode: "demo" });

    store.setState({ mass: 200 });

    expect(store.getState()).toEqual({ mass: 200, mode: "demo" });
  });

  it("notifies subscribers with updated state", () => {
    const store = new Store({ mass: 120 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ mass: 200 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ mass: 200 });
  });

  it("stops notifying an unsubscribed listener", () => {
    const store = new Store({ mass: 120 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setState({ mass: 200 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates state snapshots between listeners", () => {
    const store = new Store({ nested: { value: 1 } });
    const secondListener = vi.fn();
    store.subscribe((state) => { state.nested.value = 99; });
    store.subscribe(secondListener);

    store.setState({ mode: "GR" });

    expect(secondListener).toHaveBeenCalledWith({ nested: { value: 1 }, mode: "GR" });
    expect(store.getState()).toEqual({ nested: { value: 1 }, mode: "GR" });
  });
});
