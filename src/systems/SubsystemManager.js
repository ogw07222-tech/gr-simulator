export class SubsystemManager {
  constructor(subsystems = []) {
    this.entries = [];
    this.initialized = false;
    this.disposed = false;

    for (let index = 0; index < subsystems.length; index += 1) {
      this.register(subsystems[index]);
    }
  }

  register(subsystem, order = subsystem?.order ?? 0) {
    if (this.initialized || this.disposed) throw new Error("Subsystems must be registered before initialization.");
    if (!subsystem || typeof subsystem !== "object") throw new TypeError("A subsystem object is required.");
    if (!Number.isFinite(order)) throw new TypeError("Subsystem order must be finite.");
    if (this.entries.some((entry) => entry.subsystem === subsystem)) throw new Error("Subsystem is already registered.");

    this.entries.push({ subsystem, order, registrationIndex: this.entries.length });
    return subsystem;
  }

  initialize(context) {
    if (this.disposed) throw new Error("Cannot initialize a disposed SubsystemManager.");
    if (this.initialized) return;

    this.entries.sort((left, right) => left.order - right.order || left.registrationIndex - right.registrationIndex);
    for (let index = 0; index < this.entries.length; index += 1) {
      this.entries[index].subsystem.initialize?.(context);
    }
    this.initialized = true;
  }

  update(delta, state, snapshot) {
    if (!this.initialized || this.disposed) return;
    for (let index = 0; index < this.entries.length; index += 1) {
      this.entries[index].subsystem.update?.(delta, state, snapshot);
    }
  }

  render(delta, state, snapshot) {
    if (!this.initialized || this.disposed) return;
    for (let index = 0; index < this.entries.length; index += 1) {
      this.entries[index].subsystem.render?.(delta, state, snapshot);
    }
  }

  dispose() {
    if (this.disposed) return;
    const errors = [];
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      try {
        this.entries[index].subsystem.dispose?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this.entries.length = 0;
    this.initialized = false;
    this.disposed = true;
    if (errors.length > 0) throw new AggregateError(errors, "One or more subsystems failed to dispose.");
  }
}
