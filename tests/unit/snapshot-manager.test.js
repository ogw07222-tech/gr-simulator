import { describe, expect, it, vi } from "vitest";
import { SnapshotManager } from "../../src/systems/SnapshotManager.js";

function createBuffer() {
  const data = { value: 0 };
  const view = Object.freeze({
    get value() { return data.value; },
  });
  return { data, view };
}

function copy(target, source) {
  target.value = source.value;
}

describe("SnapshotManager", () => {
  it("publishes and returns the latest immutable snapshot", () => {
    const snapshots = new SnapshotManager({ createBuffer, copy });

    const snapshot = snapshots.publish({ value: 7 });

    expect(snapshot.value).toBe(7);
    expect(snapshots.latest()).toBe(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => { snapshot.value = 8; }).toThrow(TypeError);
  });

  it("increments revision only when publishing", () => {
    const snapshots = new SnapshotManager({ createBuffer, copy });

    expect(snapshots.revision()).toBe(0);
    snapshots.publish({ value: 1 });
    snapshots.publish({ value: 2 });

    expect(snapshots.revision()).toBe(2);
  });

  it("returns null before the first publication", () => {
    const snapshots = new SnapshotManager({ createBuffer, copy });

    expect(snapshots.latest()).toBeNull();
  });

  it("preallocates and reuses buffers without allocating on publish", () => {
    const factory = vi.fn(createBuffer);
    const snapshots = new SnapshotManager({ createBuffer: factory, copy, bufferCount: 2 });
    const first = snapshots.publish({ value: 1 });
    snapshots.publish({ value: 2 });
    const reused = snapshots.publish({ value: 3 });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(reused).toBe(first);
    expect(reused.value).toBe(3);
  });
});
