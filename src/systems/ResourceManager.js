export class ResourceManager {
  constructor() {
    this.entries = [];
    this.disposed = false;
  }

  register(resource, disposer = null) {
    if (this.disposed) throw new Error("Cannot register resources after disposeAll.");
    if (resource === null || resource === undefined) throw new TypeError("A resource is required.");
    if (disposer !== null && typeof disposer !== "function") throw new TypeError("The disposer must be a function.");

    this.entries.push({ resource, disposer, disposed: false });
    return resource;
  }

  dispose(resource) {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (entry.resource === resource && !entry.disposed) {
        this.#disposeEntry(entry);
        return true;
      }
    }
    return false;
  }

  disposeAll() {
    if (this.disposed) return;
    const errors = [];
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      try {
        this.#disposeEntry(this.entries[index]);
      } catch (error) {
        errors.push(error);
      }
    }
    this.entries.length = 0;
    this.disposed = true;
    if (errors.length > 0) throw new AggregateError(errors, "One or more resources failed to dispose.");
  }

  #disposeEntry(entry) {
    if (entry.disposed) return;
    entry.disposed = true;

    if (entry.disposer) {
      entry.disposer(entry.resource);
    } else if (typeof entry.resource === "function") {
      entry.resource();
    } else if (typeof entry.resource.dispose === "function") {
      entry.resource.dispose();
    } else if (typeof entry.resource.disconnect === "function") {
      entry.resource.disconnect();
    }
  }
}
