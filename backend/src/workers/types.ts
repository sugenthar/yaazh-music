export const JOB_RETRIED = "RETRIED";
export const JOB_COMPLETED = "COMPLETED";
export const JOB_FAILED = "FAILED";

export interface Job {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  lastError?: string | null;
}

export interface JobHandler {
  (payload: unknown, job: Job): Promise<void>;
}

export interface RegisterJobOptions {
  concurrency?: number;
  retryBackoffMs?: number;
}

export interface EnqueueOptions {
  /** Unique ID to enforce idempotency. Re-enqueueing the same id is a no-op. */
  id?: string;
  maxAttempts?: number;
  delayMs?: number;
}
