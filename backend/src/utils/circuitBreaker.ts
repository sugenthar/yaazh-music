export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenRequests: number;
}

interface CircuitBreakerStats {
  successes: number;
  failures: number;
  timeouts: number;
  consecutiveFailures: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  state: CircuitState;
  openedAt: number | null;
  totalRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private successes = 0;
  private failures = 0;
  private timeouts = 0;
  private lastSuccess: number | null = null;
  private lastFailure: number | null = null;
  private openedAt: number | null = null;
  private halfOpenAttempts = 0;
  private totalRequests = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly halfOpenRequests: number;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold;
    this.cooldownMs = options.cooldownMs;
    this.halfOpenRequests = options.halfOpenRequests || 1;
  }

  getState(): CircuitState {
    if (this.state === "open" && this.openedAt) {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      }
    }
    return this.state;
  }

  isAvailable(): boolean {
    const state = this.getState();
    return state === "closed" || state === "half-open";
  }

  recordSuccess(): void {
    this.successes++;
    this.consecutiveFailures = 0;
    this.lastSuccess = Date.now();
    if (this.state === "half-open") {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.halfOpenRequests) {
        this.state = "closed";
        this.openedAt = null;
      }
    }
    this.totalRequests++;
  }

  recordFailure(isTimeout: boolean = false): void {
    if (isTimeout) {
      this.timeouts++;
    }
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailure = Date.now();
    this.totalRequests++;

    if (this.state === "half-open") {
      this.trip();
      return;
    }

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = "open";
    this.openedAt = Date.now();
    this.halfOpenAttempts = 0;
  }

  reset(): void {
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenAttempts = 0;
  }

  getStats(): CircuitBreakerStats {
    return {
      successes: this.successes,
      failures: this.failures,
      timeouts: this.timeouts,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccess: this.lastSuccess,
      lastFailure: this.lastFailure,
      state: this.getState(),
      openedAt: this.openedAt,
      totalRequests: this.totalRequests,
    };
  }
}
