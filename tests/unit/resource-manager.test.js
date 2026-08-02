import { describe, expect, it, vi } from "vitest";
import { ResourceManager } from "../../src/systems/ResourceManager.js";

describe("ResourceManager", () => {
  it("disposes registered resources in reverse ownership order", () => {
    const order = [];
    const resources = new ResourceManager();
    resources.register({ dispose: () => order.push("first") });
    resources.register({ dispose: () => order.push("second") });

    resources.disposeAll();

    expect(order).toEqual(["second", "first"]);
  });

  it("supports subscriptions and DOM-listener cleanup functions", () => {
    const unsubscribe = vi.fn();
    const resources = new ResourceManager();
    resources.register(unsubscribe);

    resources.disposeAll();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("disconnects observers", () => {
    const observer = { disconnect: vi.fn() };
    const resources = new ResourceManager();
    resources.register(observer);

    resources.disposeAll();

    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it("disposes an individual resource at most once", () => {
    const resource = { dispose: vi.fn() };
    const resources = new ResourceManager();
    resources.register(resource);

    expect(resources.dispose(resource)).toBe(true);
    expect(resources.dispose(resource)).toBe(false);
    resources.disposeAll();

    expect(resource.dispose).toHaveBeenCalledOnce();
  });

  it("uses an explicit disposer for buffers and renderer-owned resources", () => {
    const buffer = new Float32Array(8);
    const disposer = vi.fn();
    const resources = new ResourceManager();
    resources.register(buffer, disposer);

    resources.disposeAll();

    expect(disposer).toHaveBeenCalledWith(buffer);
  });

  it("continues disposing resources after a disposer fails", () => {
    const finalDisposer = vi.fn();
    const resources = new ResourceManager();
    resources.register(finalDisposer);
    resources.register(() => { throw new Error("dispose failure"); });

    expect(() => resources.disposeAll()).toThrow(AggregateError);
    expect(finalDisposer).toHaveBeenCalledOnce();
  });
});
