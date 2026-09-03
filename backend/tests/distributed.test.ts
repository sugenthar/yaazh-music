import { describe, expect, it, vi, beforeEach } from "vitest";

import { CacheService } from "../src/services/cache";
import type { CacheAdapter } from "../src/services/cache/types";

const makeMemoryAdapter = (seed: Record<string, string> = {}) => {
  const data = new Map<string, string>(Object.entries(seed));
  return {
    get: vi.fn(async (k: string) => data.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      data.set(k, v);
      return true;
    }),
    del: vi.fn(async (k: string) => data.delete(k)),
    invalidate: vi.fn(async () => 0),
    has: vi.fn(async (k: string) => data.has(k)),
    clear: vi.fn(async () => data.clear()),
    size: vi.fn(async () => data.size),
    isHealthy: vi.fn(async () => true),
    close: vi.fn(async () => {}),
  } as unknown as CacheAdapter;
};

describe("cache shared tier", () => {
  let cache: CacheService;
  let adapter: ReturnType<typeof makeMemoryAdapter>;

  beforeEach(() => {
    cache = new CacheService({ ttlMs: 5000, staleTtlMs: 5000 });
    adapter = makeMemoryAdapter();
    cache.attachShared(adapter);
  });

  it("set writes through to the shared adapter with JSON + ttl", async () => {
    cache.set("k", { a: 1 });
    await new Promise((r) => setTimeout(r, 5));
    expect(adapter.set).toHaveBeenCalledWith("k", JSON.stringify({ a: 1 }), 5);
  });

  it("getOrSet reads through from the shared adapter on local miss", async () => {
    const other = makeMemoryAdapter({ sharedKey: JSON.stringify({ from: "shared" }) });
    cache.attachShared(other);
    const factory = vi.fn(async () => "local");
    const result = await cache.getOrSet("sharedKey", factory);
    expect(result).toEqual({ from: "shared" });
    expect(factory).not.toHaveBeenCalled();
    const stats = cache.getStats();
    expect(stats.sharedHits).toBe(1);
  });

  it("getOrSet falls back to factory when shared miss", async () => {
    const factory = vi.fn(async () => "local value");
    const result = await cache.getOrSet("missing", factory);
    expect(result).toBe("local value");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("does not propagate shared adapter errors", async () => {
    adapter.get = vi.fn(async () => {
      throw new Error("redis down");
    });
    const factory = vi.fn(async () => "local fallback");
    const result = await cache.getOrSet("k", factory);
    expect(result).toBe("local fallback");
    expect(factory).toHaveBeenCalledTimes(1);
    expect(cache.getStats().sharedErrors).toBeGreaterThan(0);
  });

  it("delete propagates to the shared adapter", async () => {
    cache.set("k", "v");
    await new Promise((r) => setTimeout(r, 5));
    cache.delete("k");
    expect(adapter.del).toHaveBeenCalledWith("k");
  });
});

describe("instance identity", () => {
  it("metrics snapshot carries an instanceId", async () => {
    const { metrics } = await import("../src/services/metrics");
    const snapshot = metrics.getSnapshot();
    expect(typeof snapshot.instanceId).toBe("string");
    expect(snapshot.instanceId.length).toBeGreaterThan(0);
  });

  it("metrics include distributed and worker counters", async () => {
    const { metrics } = await import("../src/services/metrics");
    const snapshot = metrics.getSnapshot();
    expect(snapshot).toHaveProperty("cacheSharedHits");
    expect(snapshot).toHaveProperty("workerJobs");
    expect(snapshot).toHaveProperty("backupFiles");
    expect(snapshot).toHaveProperty("redisLatencyMs");
  });
});
