import { Job, JobHandler, RegisterJobOptions } from "./types";
import { JobQueue, createJobQueue } from "./queue";
import { logger } from "../utils/logger";
import { metrics } from "../services/metrics";
import env from "../config/env";
import { getRedis, isRedisConfigured } from "../config/redis";

interface RegisteredJob {
  handler: JobHandler;
  concurrency: number;
  retryBackoffMs: number;
}

export class WorkerManager {
  private handlers = new Map<string, RegisteredJob>();
  private queue: JobQueue;
  private running = false;
  private activeCount = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private inflight = new Set<string>();
  private processed = new Set<string>();

  constructor(queue?: JobQueue) {
    this.queue = queue ?? createJobQueue();
  }

  register(type: string, handler: JobHandler, options: RegisterJobOptions = {}): void {
    if (this.handlers.has(type)) {
      throw new Error(`Worker already registered for job type: ${type}`);
    }
    this.handlers.set(type, {
      handler,
      concurrency: options.concurrency ?? env.workerConcurrency,
      retryBackoffMs: options.retryBackoffMs ?? 100,
    });
  }

  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }

  async enqueue(type: string, payload: unknown, options?: { id?: string; maxAttempts?: number }): Promise<Job> {
    if (!this.handlers.has(type)) {
      throw new Error(`No handler registered for job type: ${type}`);
    }
    const job = await this.queue.enqueue(type, payload, options);
    return job;
  }

  getQueueSize(): Promise<number> {
    return this.queue.size();
  }

  getMetrics(): { active: number; pending: string[] } {
    return { active: this.activeCount, pending: [...this.inflight] };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info("worker.start", {
      instanceId: env.instanceId,
      handlers: [...this.handlers.keys()],
      distributed: isRedisConfigured(),
    });
    this.pump();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async drain(): Promise<void> {
    this.stop();
    while (this.activeCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await this.queue.close();
  }

  private pump(): void {
    if (!this.running) return;
    this.pollTimer = setTimeout(() => this.tick(), env.workerPollIntervalMs);
    if (this.pollTimer.unref) this.pollTimer.unref();
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    try {
      const handled = [...this.handlers.keys()];
      for (const type of handled) {
        const reg = this.handlers.get(type)!;
        if (this.activeCount >= this.sumConcurrency()) break;
        // Process up to remaining concurrency
        while (this.activeCount < this.sumConcurrency()) {
          const job = await this.queue.pop();
          if (!job) break;
          const reg2 = this.handlers.get(job.type);
          if (!reg2) {
            await this.queue.deadLetter(job);
            continue;
          }
          if (this.inflight.has(job.id)) continue;
          this.inflight.add(job.id);
          this.activeCount++;
          this.process(job, reg2);
        }
      }
    } catch (err) {
      logger.warn("worker.tick.failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    } finally {
      this.pump();
    }
  }

  private sumConcurrency(): number {
    let total = 0;
    for (const reg of this.handlers.values()) {
      total += reg.concurrency;
    }
    return Math.max(1, total);
  }

  private async process(job: Job, reg: RegisteredJob): Promise<void> {
    const attempt = job.attempts + 1;
    const nextJob: Job = { ...job, attempts: attempt, lastError: null };

    try {
      metrics.recordWorkerJob();
      await reg.handler(job.payload, nextJob);
      metrics.recordWorkerSuccess();
      await this.ack(job.id);
      logger.info("worker.job.completed", { jobId: job.id, type: job.type, attempts: attempt });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      nextJob.lastError = message;
      if (attempt >= nextJob.maxAttempts) {
        metrics.recordWorkerFailure();
        await this.queue.deadLetter(nextJob);
        logger.warn("worker.job.failed_final", {
          jobId: job.id,
          type: job.type,
          attempts: attempt,
          error: message,
        });
        this.inflight.delete(job.id);
        this.activeCount--;
        return;
      }
      metrics.recordWorkerRetry();
      logger.warn("worker.job.retry", {
        jobId: job.id,
        type: job.type,
        attempts: attempt,
        maxAttempts: nextJob.maxAttempts,
        error: message,
      });
      this.inflight.delete(job.id);
      this.activeCount--;
      await this.queue.requeue(nextJob, reg.retryBackoffMs);
    }
  }

  private async ack(jobId: string): Promise<void> {
    this.inflight.delete(jobId);
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.processed.add(jobId);
  }
}

export const workerManager = new WorkerManager();
export const startWorker = (): void => workerManager.start();
export const stopWorker = (): Promise<void> => workerManager.drain();
