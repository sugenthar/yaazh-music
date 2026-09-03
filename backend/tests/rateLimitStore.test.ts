import { describe, expect, it, vi, beforeEach } from "vitest";

const mockClient = {
  eval: vi.fn(),
  decr: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  pipeline: vi.fn(),
};

const fakeGetRedis = vi.fn(() => mockClient);
const fakeIsRedisConfigured = vi.fn(() => false);

vi.mock("../src/config/redis", () => ({
  getRedis: (...args: unknown[]) => fakeGetRedis(...args),
  isRedisConfigured: (...args: unknown[]) => fakeIsRedisConfigured(...args),
}));

import { MemoryRateLimitStore, RedisRateLimitStore, createRateLimitStore } from "../src/rateLimit/store";

const makeOptions = (overrides: Partial<{ windowMs: number; prefix: string }> = {}) => ({
  windowMs: overrides.windowMs ?? 1000,
  prefix: overrides.prefix ?? "rl",
} as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MemoryRateLimitStore", () => {
  it("increments a fresh key to 1", async () => {
    const store = new MemoryRateLimitStore();
    store.init(makeOptions());
    const info = await store.increment("abc");
    expect(info.totalHits).toBe(1);
  });

  it("increments an existing key within the window", async () => {
    const store = new MemoryRateLimitStore();
    store.init(makeOptions({ windowMs: 60_000 }));
    await store.increment("abc");
    const info = await store.increment("abc");
    expect(info.totalHits).toBe(2);
  });

  it("resets the counter when the window has elapsed", async () => {
    const store = new MemoryRateLimitStore();
    store.init(makeOptions({ windowMs: 1000 }));
    await store.increment("abc");
    // simulate window expiry by resetting the internal time
    const bucket = (store as unknown as { bucket: Map<string, { totalHits: number; resetAt: number }> }).bucket;
    const entry = bucket.get("abc")!;
    entry.resetAt = Date.now() - 1;
    const info = await store.increment("abc");
    expect(info.totalHits).toBe(1);
  });

  it("decrement clamps at zero", async () => {
    const store = new MemoryRateLimitStore();
    store.init(makeOptions());
    await store.increment("abc");
    await store.decrement("abc");
    await store.decrement("abc");
    const bucket = (store as unknown as { bucket: Map<string, { totalHits: number }> }).bucket;
    expect(bucket.get("abc")!.totalHits).toBe(0);
  });

  it("resetKey clears a key and resetAll clears all", async () => {
    const store = new MemoryRateLimitStore();
    store.init(makeOptions());
    await store.increment("a");
    await store.increment("b");
    await store.resetKey("a");
    const bucket = (store as unknown as { bucket: Map<string, unknown> }).bucket;
    expect(bucket.has("a")).toBe(false);
    expect(bucket.has("b")).toBe(true);
    await store.resetAll();
    expect(bucket.size).toBe(0);
  });

  it("createRateLimitStore returns memory store when redis not configured", () => {
    fakeIsRedisConfigured.mockReturnValueOnce(false);
    expect(createRateLimitStore()).toBeInstanceOf(MemoryRateLimitStore);
  });
});

describe("RedisRateLimitStore", () => {
  it("uses redis eval and returns counts", async () => {
    fakeIsRedisConfigured.mockReturnValue(true);
    mockClient.eval.mockResolvedValue([3, 500]);
    const store = new RedisRateLimitStore();
    store.init(makeOptions({ prefix: "rl" }));
    const info = await store.increment("xyz");
    expect(mockClient.eval).toHaveBeenCalledWith(expect.stringContaining("INCR"), 1, "rl:xyz", 1);
    expect(info.totalHits).toBe(3);
    expect(info.resetTime).toBeInstanceOf(Date);
  });

  it("falls back to in-memory when redis throws", async () => {
    fakeIsRedisConfigured.mockReturnValue(true);
    mockClient.eval.mockRejectedValue(new Error("down"));
    const store = new RedisRateLimitStore();
    store.init(makeOptions({ windowMs: 5000 }));
    const info = await store.increment("xyz");
    expect(info.totalHits).toBe(1);
    // second call still served from memory fallback
    const info2 = await store.increment("xyz");
    expect(info2.totalHits).toBe(2);
  });

  it("falls back to in-memory when redis returns null (unavailable client), and still counts", async () => {
    fakeGetRedis.mockReturnValueOnce(null);
    const store = new RedisRateLimitStore();
    store.init(makeOptions({ windowMs: 5000 }));
    const info = await store.increment("xyz");
    expect(info.totalHits).toBe(1);
  });

  it("resetKey clears local and redis", async () => {
    fakeIsRedisConfigured.mockReturnValue(true);
    mockClient.del.mockResolvedValue(1);
    const store = new RedisRateLimitStore();
    store.init(makeOptions());
    await store.increment("xyz");
    await store.resetKey("xyz");
    expect(mockClient.del).toHaveBeenCalledWith("rl:xyz");
  });

  it("decrement sends decr when redis available", async () => {
    fakeIsRedisConfigured.mockReturnValue(true);
    mockClient.decr.mockResolvedValue(0);
    const store = new RedisRateLimitStore();
    store.init(makeOptions());
    await store.decrement("abc");
    expect(mockClient.decr).toHaveBeenCalledWith("rl:abc");
  });
});
