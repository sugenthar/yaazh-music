import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config/env", () => ({
  default: {
    cacheTtlMs: 100,
    cacheStaleTtlMs: 200,
    cacheMaxSize: 1000,
    enableStaleWhileRevalidate: true,
  },
}));

import env from "../src/config/env";
import { CacheService } from "../src/services/cache";

const makeCache = (overrides?: { ttlMs?: number; staleTtlMs?: number; maxSize?: number }) =>
  new CacheService({ ttlMs: 100, staleTtlMs: 200, ...overrides });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CacheService", () => {
  describe("set / get roundtrip", () => {
    it("returns the same value that was set", () => {
      const cache = makeCache();
      cache.set("key1", { foo: "bar" });
      expect(cache.get("key1")).toEqual({ foo: "bar" });
    });

    it("overwrites a previous value for the same key", () => {
      const cache = makeCache();
      cache.set("key1", "first");
      cache.set("key1", "second");
      expect(cache.get("key1")).toBe("second");
    });
  });

  describe("get with missing key", () => {
    it("returns undefined for a key that was never set", () => {
      const cache = makeCache();
      expect(cache.get("nonexistent")).toBeUndefined();
    });
  });

  describe("has", () => {
    it("returns true for an existing key", () => {
      const cache = makeCache();
      cache.set("exists", 42);
      expect(cache.has("exists")).toBe(true);
    });

    it("returns false for a missing key", () => {
      const cache = makeCache();
      expect(cache.has("nope")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes the entry and returns true", () => {
      const cache = makeCache();
      cache.set("del", "value");
      expect(cache.delete("del")).toBe(true);
      expect(cache.get("del")).toBeUndefined();
    });

    it("returns false when the key does not exist", () => {
      const cache = makeCache();
      expect(cache.delete("ghost")).toBe(false);
    });
  });

  describe("invalidate", () => {
    it("removes entries matching a wildcard pattern", () => {
      const cache = makeCache();
      cache.set("music:search:rock:1:20", "a");
      cache.set("music:search:jazz:1:20", "b");
      cache.set("music:feed:1:20", "c");
      cache.set("provider:health:audius", "d");

      const removed = cache.invalidate("music:search:*");
      expect(removed).toBe(2);
      expect(cache.has("music:search:rock:1:20")).toBe(false);
      expect(cache.has("music:search:jazz:1:20")).toBe(false);
      expect(cache.has("music:feed:1:20")).toBe(true);
      expect(cache.has("provider:health:audius")).toBe(true);
    });

    it("returns 0 when no keys match", () => {
      const cache = makeCache();
      cache.set("other:key", "v");
      expect(cache.invalidate("music:*")).toBe(0);
    });

    it("supports exact-match patterns without wildcards", () => {
      const cache = makeCache();
      cache.set("exact", 1);
      cache.set("exact-two", 2);
      expect(cache.invalidate("exact")).toBe(1);
      expect(cache.has("exact")).toBe(false);
      expect(cache.has("exact-two")).toBe(true);
    });
  });

  describe("TTL expiration", () => {
    it("returns undefined after ttlMs + staleTtlMs have elapsed", () => {
      const cache = makeCache({ ttlMs: 100, staleTtlMs: 200 });
      cache.set("ttl", "ephemeral");

      vi.advanceTimersByTime(300);
      expect(cache.get("ttl")).toBe("ephemeral");

      vi.advanceTimersByTime(1);
      expect(cache.get("ttl")).toBeUndefined();
    });

    it("has() returns false after expiration", () => {
      const cache = makeCache({ ttlMs: 50, staleTtlMs: 50 });
      cache.set("exp", 1);

      vi.advanceTimersByTime(100);
      expect(cache.has("exp")).toBe(true);

      vi.advanceTimersByTime(1);
      expect(cache.has("exp")).toBe(false);
    });
  });

  describe("stale behavior", () => {
    it("get returns value even when stale (within ttlMs + staleTtlMs)", () => {
      const cache = makeCache({ ttlMs: 100, staleTtlMs: 200 });
      cache.set("stale", "data");

      vi.advanceTimersByTime(150);
      expect(cache.get("stale")).toBe("data");
    });

    it("getStale reports isStale correctly", () => {
      const cache = makeCache({ ttlMs: 100, staleTtlMs: 200 });
      cache.set("s", "v");

      vi.advanceTimersByTime(50);
      expect(cache.getStale("s")).toEqual({ value: "v", isStale: false });

      vi.advanceTimersByTime(60);
      expect(cache.getStale("s")).toEqual({ value: "v", isStale: true });
    });
  });

  describe("getOrSet", () => {
    it("returns cached value on hit without calling factory", async () => {
      const cache = makeCache();
      const factory = vi.fn(async () => "from factory");
      cache.set("hit", "cached");

      const result = await cache.getOrSet("hit", factory);
      expect(result).toBe("cached");
      expect(factory).not.toHaveBeenCalled();
    });

    it("calls factory on miss and caches the result", async () => {
      const cache = makeCache();
      const factory = vi.fn(async () => "new value");

      const result = await cache.getOrSet("miss", factory);
      expect(result).toBe("new value");
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get("miss")).toBe("new value");
    });

    it("propagates factory errors", async () => {
      const cache = makeCache();
      const factory = vi.fn(async () => {
        throw new Error("boom");
      });

      await expect(cache.getOrSet("err", factory)).rejects.toThrow("boom");
    });
  });

  describe("getOrSetStale", () => {
    it("returns fresh value without calling backgroundRefresh", async () => {
      const cache = makeCache({ ttlMs: 100, staleTtlMs: 200 });
      const factory = vi.fn(async () => "fresh");
      const bgRefresh = vi.fn(async (v: string) => v);

      const result = await cache.getOrSetStale("s1", factory, bgRefresh);
      expect(result).toBe("fresh");
      expect(bgRefresh).not.toHaveBeenCalled();
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("returns cached value and calls backgroundRefresh when stale", async () => {
      const cache = makeCache({ ttlMs: 100, staleTtlMs: 200 });
      const factory = vi.fn(async () => "initial");
      const bgRefresh = vi.fn(async (_v: string) => "refreshed");

      await cache.getOrSetStale("s2", factory, bgRefresh);
      expect(factory).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(150);

      const result = await cache.getOrSetStale("s2", factory, bgRefresh);
      expect(result).toBe("initial");
      expect(bgRefresh).toHaveBeenCalledTimes(1);
      expect(bgRefresh).toHaveBeenCalledWith("initial");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("returns cached value without backgroundRefresh when feature is disabled", async () => {
      const original = env.enableStaleWhileRevalidate;
      env.enableStaleWhileRevalidate = false;
      try {
        const cache = makeCache({ ttlMs: 100, staleTtlMs: 200 });
        const factory = vi.fn(async () => "initial");
        const bgRefresh = vi.fn(async (v: string) => v);

        await cache.getOrSetStale("s3", factory, bgRefresh);

        vi.advanceTimersByTime(150);

        const result = await cache.getOrSetStale("s3", factory, bgRefresh);
        expect(result).toBe("initial");
        expect(bgRefresh).not.toHaveBeenCalled();
      } finally {
        env.enableStaleWhileRevalidate = original;
      }
    });
  });

  describe("maxSize eviction", () => {
    it("evicts the oldest entry when maxSize is reached", () => {
      const cache = makeCache({ maxSize: 3 });
      cache.set("a", 1);
      vi.advanceTimersByTime(10);
      cache.set("b", 2);
      vi.advanceTimersByTime(10);
      cache.set("c", 3);

      cache.set("d", 4);

      expect(cache.size).toBe(3);
      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBe(2);
      expect(cache.get("c")).toBe(3);
      expect(cache.get("d")).toBe(4);
    });

    it("increments evictions stat on eviction", () => {
      const cache = makeCache({ maxSize: 2 });
      cache.set("x", 1);
      cache.set("y", 2);
      cache.set("z", 3);

      expect(cache.getStats().evictions).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all entries and resets size to 0", () => {
      const cache = makeCache();
      cache.set("a", 1);
      cache.set("b", 2);
      cache.set("c", 3);
      expect(cache.size).toBe(3);

      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get("a")).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("returns accurate hit/miss/set/delete counts and hitRatio", () => {
      const cache = makeCache();
      cache.set("a", 1);
      cache.set("b", 2);

      cache.get("a"); // hit
      cache.get("a"); // hit
      cache.get("missing"); // miss
      cache.delete("b"); // delete

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
      expect(stats.evictions).toBe(0);
      expect(stats.size).toBe(1);
      expect(stats.hitRatio).toBe(67);
    });

    it("returns hitRatio 0 when there are no accesses", () => {
      const cache = makeCache();
      expect(cache.getStats().hitRatio).toBe(0);
    });

    it("tracks invalidation in the deletes stat", () => {
      const cache = makeCache();
      cache.set("a", 1);
      cache.set("b", 2);
      cache.invalidate("*");
      expect(cache.getStats().deletes).toBe(2);
    });
  });
});
