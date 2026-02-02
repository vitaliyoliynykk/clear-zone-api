class Worker {
  #isWorkerRunning = false;

  constructor(pollingMs) {
    this.pollingMs = pollingMs;
  }

  run(process) {
    setInterval(async () => {
      if (this.#isWorkerRunning) return;
      try {
        this.#isWorkerRunning = true;
        await process();
      } finally {
        this.#isWorkerRunning = false;
      }
    }, this.pollingMs);
  }
}

module.exports = { Worker };
