export class Store {
  constructor(initialState) {
    this.state = structuredClone(initialState);
    this.listeners = new Set();
  }

  getState() {
    return structuredClone(this.state);
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.getState());
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
