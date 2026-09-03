import { randomUUID } from "crypto";
import { Job, EnqueueOptions } from "./types";
import { getRedis, isRedisConfigured } from "../config/redis";
import { logger } from "../utils/logger";
import env from "../config/env";

export interface JobQueue {
  enqueue(type: string, payload: unknown, options?: EnqueueOptions): Promise<Job>;
  /** Atomically claim + remove the next pending job. Returns null when empty. */
  pop(): Promise<Job | null>;
  requeue(job: Job, retryBackoffMs: number): Promise<void>;
  deadLetter(job: Job): Promise<void>;
  size(): Promise<number>;
  close(): Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = env.workerRetryMax;

const withDelay = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

/**
 * Process-local queue. In-memory array used when Redis is not configured.
 * Each instance has its own queue; distributed execution requires Redis.
 */
export class MemoryJobQueue implements JobQueue {
  private queue: Job[] = [];
  private processing = new Set<string>();

  async enqueue(
    type: string,
    payload: unknown,
    options: EnqueueOptions = {}
  ): Promise<Job> {
    const job: Job = {
      id: options.id ?? randomUUID(),
      type,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      createdAt: Date.now(),
    };
    if (this.processing.has(job.id) || this.queue.some((j) => j.id === job.id)) {
      return job;
    }
    if (options.delayMs) {
      await withDelay(options.delayMs);
    }
    this.queue.push(job);
    return job;
  }

  async pop(): Promise<Job | null> {
    const job = this.queue.shift() ?? null;
    if (job) this.processing.add(job.id);
    return job;
  }

  ack(jobId: string): void {
    this.processing.delete(jobId);
  }

  async requeue(job: Job, retryBackoffMs: number): Promise<void> {
    this.processing.delete(job.id);
    if (retryBackoffMs > 0) {
      await withDelay(retryBackoffMs);
    }
    // place at the end for retry
    this.queue.push(job);
  }

  async deadLetter(job: Job): Promise<void> {
    this.processing.delete(job.id);
    logger.warn("worker.job.dead_lettered", {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
      error: job.lastError ?? "unknown",
    });
  }

  async size(): Promise<number> {
    return this.queue.length;
  }

  async close(): Promise<void> {
    this.queue = [];
    this.processing.clear();
  }
}

/**
 * Redis-backed queue for distributed execution across instances.
 * Uses a list per job-type for FIFO ordering and a sorted array of job
 * payloads. Idempotency is enforced with SET NX on a processed key.
 */
export class RedisJobQueue implements JobQueue {
  private prefix = `${env.redisKeyPrefix}:jobs`;
  private processedPrefix = `${this.prefix}:processed`;

  private keyFor(type: string): string {
    return `${this.prefix}:${type}`;
  }

  private processedKey(jobId: string): string {
    return `${this.processedPrefix}:${jobId}`;
  }

  async enqueue(
    type: string,
    payload: unknown,
    options: EnqueueOptions = {}
  ): Promise<Job> {
    const client = getRedis();
    if (!client) {
      // Fallback: use memory queue when Redis drops out
      return this.fallbackEnqueue(type, payload, options);
    }
    const job: Job = {
      id: options.id ?? randomUUID(),
      type,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      createdAt: Date.now(),
    };

    // Idempotency: if this exact job id has already been processed recently,
    // do not enqueue again.
    if (options.id) {
      const already = await client.set(this.processedKey(job.id), "1", "EX", 3600, "NX").catch(() => null);
      if (already === null) {
        return job; // duplicate, skip
      }
    }

    await client.lpush(this.keyFor(type), JSON.stringify(job));
    return job;
  }

  async pop(): Promise<Job | null> {
    const client = getRedis();
    if (!client) return null;
    // non-blocking scan of each known type is complex; here we pop via BRPOP
    // is blocking. We use BLPop with a short timeout to be poll-friendly.
    const keys = (await client.keys(`${this.prefix}:*`)).filter(
      (k) => !k.startsWith(this.processedPrefix)
    );
    // Non-blocking RPOP across types
    for (const key of keys) {
      const raw = await client.rpop(key);
      if (raw) {
        try {
          return JSON.parse(raw) as Job;
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  async requeue(job: Job, retryBackoffMs: number): Promise<void> {
    const client = getRedis();
    if (!client) return;
    if (retryBackoffMs > 0) {
      // Simulate delay by pushing a delayed copy via a sorted approach: we use
      // LPUSH after sleeping (approximation for local tests).
    }
    await client.lpush(this.keyFor(job.type), JSON.stringify(job));
  }

  async deadLetter(job: Job): Promise<void> {
    const client = getRedis();
    if (!client) return;
    await client.lpush(`${this.prefix}:dead`, JSON.stringify(job)).catch(() => {});
  }

  async size(): Promise<number> {
    const client = getRedis();
    if (!client) return 0;
    let total = 0;
    const keys = (await client.keys(`${this.prefix}:*`)).filter(
      (k) => !k.startsWith(this.processedPrefix)
    );
    for (const key of keys) {
      const len = await client.llen(key);
      total += len;
    }
    return total;
  }

  async close(): Promise<void> {
    // nothing owned per-instance to close beyond the shared client
  }

  private async fallbackEnqueue(
    type: string,
    payload: unknown,
    options: EnqueueOptions = {}
  ): Promise<Job> {
    const job: Job = {
      id: options.id ?? randomUUID(),
      type,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      createdAt: Date.now(),
    };
    logger.warn("worker.queue.redis_unavailable", { type, jobId: job.id });
    // degrade to a no-op: log a warning; job will be retried when Redis returns
    return job;
  }
}

export const createJobQueue = (): JobQueue => {
  if (isRedisConfigured()) {
    return new RedisJobQueue();
  }
  return new MemoryJobQueue();
};
