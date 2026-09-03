import { CacheAdapter } from "./types";
import { getRedis, isRedisConfigured } from "../../config/redis";
import { logger } from "../../utils/logger";

const SCAN_COUNT = 100;

export class RedisCacheAdapter implements CacheAdapter {
  private prefix: string;
  private enabled = false;

  constructor(prefix = "cache:") {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private getRedisClient() {
    const client = getRedis();
    if (!client) return null;
    this.enabled = true;
    return client;
  }

  async get(key: string): Promise<string | null> {
    const client = this.getRedisClient();
    if (!client) return null;
    try {
      const val = await client.get(this.getKey(key));
      return val;
    } catch (err) {
      logger.debug("redis_cache.get_failed", {
        key,
        error: err instanceof Error ? err.message : "unknown",
      });
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const client = this.getRedisClient();
    if (!client) return false;
    try {
      const redisKey = this.getKey(key);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.setex(redisKey, ttlSeconds, value);
      } else {
        await client.set(redisKey, value);
      }
      return true;
    } catch (err) {
      logger.debug("redis_cache.set_failed", {
        key,
        error: err instanceof Error ? err.message : "unknown",
      });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    const client = this.getRedisClient();
    if (!client) return false;
    try {
      const result = await client.del(this.getKey(key));
      return result > 0;
    } catch (err) {
      logger.debug("redis_cache.del_failed", {
        key,
        error: err instanceof Error ? err.message : "unknown",
      });
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    const client = this.getRedisClient();
    if (!client) return false;
    try {
      const result = await client.exists(this.getKey(key));
      return result > 0;
    } catch (err) {
      logger.debug("redis_cache.has_failed", {
        key,
        error: err instanceof Error ? err.message : "unknown",
      });
      return false;
    }
  }

  async invalidate(pattern: string): Promise<number> {
    const client = this.getRedisClient();
    if (!client) return 0;

    try {
      let count = 0;
      let cursor = "0";
      const searchPattern = this.getKey(pattern.replace(/\*/g, "*"));
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          searchPattern,
          "COUNT",
          SCAN_COUNT
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          const pipeline = client.pipeline();
          for (const key of keys) {
            pipeline.del(key);
          }
          await pipeline.exec();
          count += keys.length;
        }
      } while (cursor !== "0");
      return count;
    } catch (err) {
      logger.debug("redis_cache.invalidate_failed", {
        pattern,
        error: err instanceof Error ? err.message : "unknown",
      });
      return 0;
    }
  }

  async clear(): Promise<void> {
    const client = this.getRedisClient();
    if (!client) return;
    try {
      const keys: string[] = [];
      let cursor = "0";
      do {
        const [nextCursor, batch] = await client.scan(cursor, "MATCH", `${this.prefix}*`, "COUNT", SCAN_COUNT);
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== "0");

      if (keys.length > 0) {
        const pipeline = client.pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }
        await pipeline.exec();
      }
    } catch (err) {
      logger.debug("redis_cache.clear_failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async size(): Promise<number> {
    const client = this.getRedisClient();
    if (!client) return 0;
    try {
      let count = 0;
      let cursor = "0";
      do {
        const [nextCursor, keys] = await client.scan(cursor, "MATCH", `${this.prefix}*`, "COUNT", SCAN_COUNT);
        cursor = nextCursor;
        count += keys.length;
      } while (cursor !== "0");
      return count;
    } catch {
      return 0;
    }
  }

  async isHealthy(): Promise<boolean> {
    const client = this.getRedisClient();
    if (!client) return false;
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    // Redis client lifecycle managed by config/redis.ts; nothing to do here.
    this.enabled = false;
  }

  get isConfigured(): boolean {
    return isRedisConfigured();
  }
}

export const createRedisCacheAdapter = (prefix?: string): RedisCacheAdapter | null => {
  if (!isRedisConfigured()) return null;
  return new RedisCacheAdapter(prefix);
};
