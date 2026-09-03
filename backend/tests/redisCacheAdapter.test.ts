import { describe, expect, it, vi, beforeEach } from "vitest";

const mockClient = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  scan: vi.fn(),
  ping: vi.fn(),
  pipeline: vi.fn(),
};

const fakeGetRedis = vi.fn(() => mockClient);
const fakeIsRedisConfigured = vi.fn(() => true);

vi.mock("../src/config/redis", () => ({
  getRedis: (...args: unknown[]) => fakeGetRedis(...args),
  isRedisConfigured: (...args: unknown[]) => fakeIsRedisConfigured(...args),
}));

import { RedisCacheAdapter, createRedisCacheAdapter } from "../src/services/cache/redisAdapter";

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.get.mockResolvedValue(null);
  mockClient.set.mockResolvedValue("OK");
  mockClient.setex.mockResolvedValue("OK");
  mockClient.del.mockResolvedValue(1);
  mockClient.exists.mockResolvedValue(1);
  mockClient.scan.mockResolvedValue(["0", []]);
  mockClient.ping.mockResolvedValue("PONG");
});

describe("RedisCacheAdapter", () => {
  it("prefixes keys and returns values on get", async () => {
    mockClient.get.mockResolvedValue("some-value");
    const adapter = new RedisCacheAdapter("cache:");
    const value = await adapter.get("k");
    expect(mockClient.get).toHaveBeenCalledWith("cache:k");
    expect(value).toBe("some-value");
  });

  it("set uses setex with TTL", async () => {
    const adapter = new RedisCacheAdapter("cache:");
    const ok = await adapter.set("k", "v", 60);
    expect(mockClient.setex).toHaveBeenCalledWith("cache:k", 60, "v");
    expect(ok).toBe(true);
  });

  it("set uses plain set when no TTL", async () => {
    const adapter = new RedisCacheAdapter("cache:");
    await adapter.set("k", "v");
    expect(mockClient.set).toHaveBeenCalledWith("cache:k", "v");
  });

  it("del returns false when redis reports zero deleted", async () => {
    mockClient.del.mockResolvedValue(0);
    const adapter = new RedisCacheAdapter("cache:");
    expect(await adapter.del("k")).toBe(false);
  });

  it("has returns true when key exists", async () => {
    const adapter = new RedisCacheAdapter("cache:");
    expect(await adapter.has("k")).toBe(true);
    expect(mockClient.exists).toHaveBeenCalledWith("cache:k");
  });

  it("invalidate scans and deletes matching keys", async () => {
    mockClient.scan
      .mockResolvedValueOnce(["0", ["cache:a", "cache:b"]])
      .mockResolvedValueOnce(["0", []]);
    const pipeline = {
      del: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    };
    mockClient.pipeline.mockReturnValue(pipeline);

    const adapter = new RedisCacheAdapter("cache:");
    const count = await adapter.invalidate("search:*");
    expect(count).toBe(2);
    expect(pipeline.del).toHaveBeenCalledTimes(2);
  });

  it("isHealthy pings redis and returns true", async () => {
    const adapter = new RedisCacheAdapter("cache:");
    expect(await adapter.isHealthy()).toBe(true);
    expect(mockClient.ping).toHaveBeenCalled();
  });

  it("handles redis errors gracefully (returns null / false, never throws)", async () => {
    mockClient.get.mockRejectedValueOnce(new Error("down"));
    mockClient.set.mockRejectedValueOnce(new Error("down"));
    mockClient.del.mockRejectedValueOnce(new Error("down"));
    const adapter = new RedisCacheAdapter("cache:");
    expect(await adapter.get("k")).toBeNull();
    expect(await adapter.set("k", "v")).toBe(false);
    expect(await adapter.del("k")).toBe(false);
  });

  it("createRedisCacheAdapter returns null when redis not configured", () => {
    fakeIsRedisConfigured.mockReturnValueOnce(false);
    expect(createRedisCacheAdapter()).toBeNull();
  });

  it("createRedisCacheAdapter returns adapter when configured", () => {
    expect(createRedisCacheAdapter("cache:")).toBeInstanceOf(RedisCacheAdapter);
  });
});
