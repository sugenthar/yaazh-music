import env from "../config/env";
import { getRedis, isRedisConfigured } from "../config/redis";
import { logger } from "../utils/logger";
import type { Store, ClientRateLimitInfo, Options } from "express-rate-limit";

/**
 * Fixed-window counter against Redis. All instances share the same keys,
 * giving a single distributed rate-limit counter across the fleet.
 *
 * If Redis is momentarily unavailable, the store safely falls back to an
 * in-memory counter so the API never crashes and still enforces a (local)
 * limit rather than allowing unlimited bypass.
 */
export class RedisRateLimitStore implements Store {
  private windowMs = 60_000;
  private bucketPrefix = "rl";
  private localBucket = new Map<
    string,
    { totalHits: number; resetAt: number }
  >();
  private fallbackActive = false;
  prefix?: string;

  init(options: Options): void {
    this.windowMs = options.windowMs;
    const prefix = (options as Options & { prefix?: string }).prefix;
    this.prefix = prefix;
    this.bucketPrefix = prefix || "rl";
  }

  private async incrementInRedis(
    key: string
  ): Promise<ClientRateLimitInfo | null> {
    const client = getRedis();
    if (!client) return null;
    const redisKey = `${this.bucketPrefix}:${key}`;
    const windowSeconds = Math.max(1, Math.ceil(this.windowMs / 1000));

    const lua = `
      local c = redis.call('INCR', KEYS[1])
      if c == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return {c, ttl}
    `;

    const result = (await client.eval(lua, 1, redisKey, windowSeconds)) as unknown as [
      number,
      number
    ];
    const totalHits = Number(result[0]);
    const ttlSeconds = Number(result[1]);
    return {
      totalHits,
      resetTime: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  private incrementLocal(key: string): ClientRateLimitInfo {
    this.fallbackActive = true;
    const now = Date.now();
    const entry = this.localBucket.get(key);
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.localBucket.set(key, { totalHits: 1, resetAt });
      return { totalHits: 1, resetTime: new Date(resetAt) };
    }
    entry.totalHits += 1;
    return { totalHits: entry.totalHits, resetTime: new Date(entry.resetAt) };
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    if (this.fallbackActive) {
      return this.incrementLocal(key);
    }
    try {
      const result = await this.incrementInRedis(key);
      if (result) return result;
      return this.incrementLocal(key);
    } catch (err) {
      logger.warn("rate_limit.redis_fallback", {
        key,
        error: err instanceof Error ? err.message : "unknown",
      });
      return this.incrementLocal(key);
    }
  }

  async decrement(key: string): Promise<void> {
    if (this.fallbackActive) {
      const entry = this.localBucket.get(key);
      if (entry) entry.totalHits = Math.max(0, entry.totalHits - 1);
      return;
    }
    const client = getRedis();
    if (!client) return;
    try {
      await client.decr(`${this.bucketPrefix}:${key}`);
    } catch {
      // fall back to local decrement
      const entry = this.localBucket.get(key);
      if (entry) entry.totalHits = Math.max(0, entry.totalHits - 1);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.localBucket.delete(key);
    const client = getRedis();
    if (!client) return;
    try {
      await client.del(`${this.bucketPrefix}:${key}`);
    } catch {
      /* ignore */
    }
  }

  async resetAll(): Promise<void> {
    this.localBucket.clear();
    const client = getRedis();
    if (!client) return;
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          `${this.bucketPrefix}:*`,
          "COUNT",
          200
        );
        cursor = nextCursor;
        if (keys.length) {
          const pipeline = client.pipeline();
          for (const k of keys) pipeline.del(k);
          await pipeline.exec();
        }
      } while (cursor !== "0");
    } catch {
      /* ignore */
    }
  }
}

/**
 * In-memory store. Used when Redis is not configured or unavailable.
 * Single-instance / degraded mode.
 */
export class MemoryRateLimitStore implements Store {
  private windowMs = 60_000;
  private bucketPrefix = "rl";
  private bucket = new Map<string, { totalHits: number; resetAt: number }>();
  localKeys = true;
  prefix?: string;

  init(options: Options): void {
    this.windowMs = options.windowMs;
    const prefix = (options as Options & { prefix?: string }).prefix;
    this.prefix = prefix;
    this.bucketPrefix = prefix || "rl";
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const entry = this.bucket.get(key);
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.bucket.set(key, { totalHits: 1, resetAt });
      return { totalHits: 1, resetTime: new Date(resetAt) };
    }
    entry.totalHits += 1;
    return { totalHits: entry.totalHits, resetTime: new Date(entry.resetAt) };
  }

  async decrement(key: string): Promise<void> {
    const entry = this.bucket.get(key);
    if (entry) entry.totalHits = Math.max(0, entry.totalHits - 1);
  }

  async resetKey(key: string): Promise<void> {
    this.bucket.delete(key);
  }

  async resetAll(): Promise<void> {
    this.bucket.clear();
  }
}

export const createRateLimitStore = (): Store => {
  if (isRedisConfigured()) {
    return new RedisRateLimitStore();
  }
  return new MemoryRateLimitStore();
};
