import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "../src/utils/circuitBreaker";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const makeBreaker = (overrides: Record<string, number> = {}) =>
  new CircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 5000,
    halfOpenRequests: 2,
    ...overrides,
  });

describe("CircuitBreaker", () => {
  it("starts in closed state and is available", () => {
    const cb = makeBreaker();
    expect(cb.getState()).toBe("closed");
    expect(cb.isAvailable()).toBe(true);
  });

  it("stays closed until failureThreshold consecutive failures", () => {
    const cb = makeBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");
  });

  it("opens after failureThreshold consecutive failures", () => {
    const cb = makeBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("open");
  });

  it("is not available when open", () => {
    const cb = makeBreaker({ failureThreshold: 1 });
    cb.recordFailure();
    expect(cb.getState()).toBe("open");
    expect(cb.isAvailable()).toBe(false);
  });

  it("transitions to half-open after cooldownMs", () => {
    const cb = makeBreaker({ failureThreshold: 1, cooldownMs: 5000 });
    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(4999);
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1);
    expect(cb.getState()).toBe("half-open");
  });

  it("is available when half-open", () => {
    const cb = makeBreaker({ failureThreshold: 1, cooldownMs: 1000 });
    cb.recordFailure();
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe("half-open");
    expect(cb.isAvailable()).toBe(true);
  });

  it("returns to closed after successful requests in half-open", () => {
    const cb = makeBreaker({ failureThreshold: 1, cooldownMs: 1000, halfOpenRequests: 2 });
    cb.recordFailure();
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe("half-open");

    cb.recordSuccess();
    expect(cb.getState()).toBe("half-open");
    cb.recordSuccess();
    expect(cb.getState()).toBe("closed");
  });

  it("returns to open if failure occurs during half-open", () => {
    const cb = makeBreaker({ failureThreshold: 1, cooldownMs: 1000, halfOpenRequests: 2 });
    cb.recordFailure();
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe("half-open");

    cb.recordSuccess();
    expect(cb.getState()).toBe("half-open");

    cb.recordFailure();
    expect(cb.getState()).toBe("open");
  });

  it("recordSuccess resets consecutiveFailures", () => {
    const cb = makeBreaker({ failureThreshold: 5 });
    cb.recordFailure();
    cb.recordFailure();
    let stats = cb.getStats();
    expect(stats.consecutiveFailures).toBe(2);

    cb.recordSuccess();
    stats = cb.getStats();
    expect(stats.consecutiveFailures).toBe(0);
  });

  it("tracks timeouts separately in stats", () => {
    const cb = makeBreaker({ failureThreshold: 3 });
    cb.recordFailure(true);
    cb.recordFailure(true);
    cb.recordFailure(false);

    const stats = cb.getStats();
    expect(stats.failures).toBe(3);
    expect(stats.timeouts).toBe(2);
  });

  it("reset() restores to closed state", () => {
    const cb = makeBreaker({ failureThreshold: 1 });
    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    cb.reset();
    expect(cb.getState()).toBe("closed");
    expect(cb.isAvailable()).toBe(true);
    expect(cb.getStats().consecutiveFailures).toBe(0);
  });

  it("getStats() returns accurate counts", () => {
    const cb = makeBreaker({ failureThreshold: 5 });
    cb.recordSuccess();
    cb.recordSuccess();
    cb.recordFailure();
    cb.recordFailure(true);

    const stats = cb.getStats();
    expect(stats.successes).toBe(2);
    expect(stats.failures).toBe(2);
    expect(stats.timeouts).toBe(1);
    expect(stats.consecutiveFailures).toBe(2);
    expect(stats.totalRequests).toBe(4);
    expect(stats.lastSuccess).toBeTypeOf("number");
    expect(stats.lastFailure).toBeTypeOf("number");
    expect(stats.state).toBe("closed");
  });

  it("successes during closed state don't affect failure tracking", () => {
    const cb = makeBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getState()).toBe("closed");

    cb.recordFailure();
    expect(cb.getState()).toBe("closed");

    const stats = cb.getStats();
    expect(stats.consecutiveFailures).toBe(1);
    expect(stats.totalRequests).toBe(4);
  });
});
