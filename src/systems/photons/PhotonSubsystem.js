export class PhotonSubsystem {
  constructor({ enabled = false, operations = {} } = {}) {
    this.order = 70;
    this.enabled = Boolean(enabled);
    this.operations = operations;
    this.work = {
      integrationPasses: 0,
      trajectoryUpdates: 0,
      trailUpdates: 0,
      diagnosticUpdates: 0,
      renderBufferUpdates: 0,
    };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    return this.enabled;
  }

  update(delta, state, snapshot) {
    if (!this.enabled) return 0;
    let work = 0;
    work += this.#run("integrate", "integrationPasses", delta, state, snapshot);
    work += this.#run("trajectory", "trajectoryUpdates", delta, state, snapshot);
    work += this.#run("trail", "trailUpdates", delta, state, snapshot);
    work += this.#run("diagnostics", "diagnosticUpdates", delta, state, snapshot);
    return work;
  }

  render(delta, state, snapshot) {
    if (!this.enabled) return 0;
    return this.#run("renderBuffers", "renderBufferUpdates", delta, state, snapshot);
  }

  resetWorkCounters() {
    for (const key of Object.keys(this.work)) this.work[key] = 0;
  }

  getDiagnostics() {
    return { enabled: this.enabled, ...this.work };
  }

  #run(operation, counter, ...args) {
    const callback = this.operations[operation];
    if (typeof callback !== "function") return 0;
    callback(...args);
    this.work[counter] += 1;
    return 1;
  }
}
