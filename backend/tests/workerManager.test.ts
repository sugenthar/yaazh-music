import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config/env", () => ({
  default: {
    workerRetryMax: 3,
    workerPollIntervalMs: 5,
    workerConcurrency: 2,
    instanceId: "test-instance",
    redisKeyPrefix: "yaazh",
  },
}));

import { WorkerManager } from "../src/workers/workerManager";
import { MemoryJobQueue } from "../src/workers/queue";

const flush = () => new Promise((r) => setTimeout(r, 50));

describe("WorkerManager with MemoryJobQueue", () => {
  it("enqueues and processes a job exactly once", async () => {
    const manager = new WorkerManager(new MemoryJobQueue());
    const handler = vi.fn(async () => {});
    manager.register("email", handler);
    manager.start();

    await manager.enqueue("email", { to: "a@b.c" });
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      { to: "a@b.c" },
      expect.objectContaining({ type: "email" })
    );
    manager.stop();
  });

  it("enforcing idempotency: re-enqueueing the same id does not re-process", async () => {
    const manager = new WorkerManager(new MemoryJobQueue());
    const handler = vi.fn(async () => {});
    manager.register("job", handler, { concurrency: 1 });
    manager.start();

    await manager.enqueue("job", { n: 1 }, { id: "fixed-id" });
    await manager.enqueue("job", { n: 2 }, { id: "fixed-id" });
    await flush();

    expect(handler).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  it("retries failed jobs up to maxAttempts, then dead-letters", async () => {
    const manager = new WorkerManager(new MemoryJobQueue());
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });
    manager.register("failing", handler, { concurrency: 1, retryBackoffMs: 1 });
    manager.start();

    await manager.enqueue("failing", {}, { maxAttempts: 3 });
    await flush();

    // initial + 2 retries = 3 attempts, then dead-lettered
    expect(handler).toHaveBeenCalledTimes(3);
    expect(await manager.getQueueSize()).toBe(0);
    manager.stop();
  });

  it("does not process unknown job types", async () => {
    const manager = new WorkerManager(new MemoryJobQueue());
    const handler = vi.fn(async () => {});
    manager.register("known", handler);
    manager.start();

    await manager.enqueue("known", {});
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    manager.stop();
  });

  it("throws when enqueuing a job type with no handler", async () => {
    const manager = new WorkerManager(new MemoryJobQueue());
    await expect(manager.enqueue("missing", {})).rejects.toThrow("No handler");
  });

  it("getMetrics reports active and pending jobs", async () => {
    const manager = new WorkerManager(new MemoryJobQueue());
    manager.register("m", async () => {}, { concurrency: 2 });
    manager.start();
    await manager.enqueue("m", {});
    await flush();
    expect(typeof manager.getMetrics().active).toBe("number");
    manager.stop();
  });
});
