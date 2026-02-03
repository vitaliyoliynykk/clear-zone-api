export class Worker {
  private isWorkerRunning = false;
  private pollingMs = 30000;

  constructor(pollingMs) {
    this.pollingMs = pollingMs;
  }

  run(process: () => Promise<void>): void {
    setInterval(async () => {
      if (this.isWorkerRunning) return;
      try {
        this.isWorkerRunning = true;
        await process();
      } finally {
        this.isWorkerRunning = false;
      }
    }, this.pollingMs);
  }
}
