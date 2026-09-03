import env from "../config/env";
import { logger } from "../utils/logger";
import { metrics } from "./metrics";

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  staleAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  errors: number;
  staleResponses: number;
}

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private ttlMs: number;
  private staleTtlMs: number;
  private maxSize: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    errors: 0,
    staleResponses: 0,
  };

  constructor(options?: { ttlMs?: number; staleTtlMs?: number; maxSize?: number }) {
    this.ttlMs = options?.ttlMs ?? env.cacheTtlMs;
    this.staleTtlMs = options?.staleTtlMs ?? env.cacheStaleTtlMs;
    this.maxSize = options?.maxSize ?? env.cacheMaxSize;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      metrics.recordCacheMiss();
      return undefined;
    }
    const now = Date.now();
    if (now > entry.createdAt + this.ttlMs + this.staleTtlMs) {
      this.store.delete(key);
      this.stats.misses++;
      metrics.recordCacheMiss();
      return undefined;
    }
    this.stats.hits++;
    metrics.recordCacheHit();
    return entry.value as T;
  }

  getStale<T = unknown>(key: string): { value: T; isStale: boolean } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    if (now > entry.createdAt + this.ttlMs + this.staleTtlMs) {
      this.store.delete(key);
      return undefined;
    }
    const isStale = now > entry.staleAt;
    if (isStale) this.stats.staleResponses++;
    return { value: entry.value as T, isStale };
  }

  set<T = unknown>(key: string, value: T): void {
    if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }
    const now = Date.now();
    this.store.set(key, {
      value,
      createdAt: now,
      staleAt: now + this.ttlMs,
    });
    this.stats.sets++;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    const now = Date.now();
    if (now > entry.createdAt + this.ttlMs + this.staleTtlMs) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const result = this.store.delete(key);
    this.inFlight.delete(key);
    if (result) this.stats.deletes++;
    return result;
  }

  invalidate(pattern: string): number {
    let count = 0;
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.inFlight.delete(key);
        count++;
      }
    }
    this.stats.deletes += count;
    return count;
  }

  async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    ttlOverride?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = (async () => {
      try {
        const value = await factory();
        this.set(key, value);
        if (ttlOverride) {
          const entry = this.store.get(key);
          if (entry) {
            entry.staleAt = Date.now() + ttlOverride;
          }
        }
        return value;
      } catch (err) {
        this.stats.errors++;
        metrics.recordCacheError();
        logger.warn("cache.getOrSet.factory_failed", {
          key,
          error: err instanceof Error ? err.message : "unknown",
        });
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  async getOrSetStale<T = unknown>(
    key: string,
    factory: () => Promise<T>,
    backgroundRefresh?: (value: T) => Promise<T>
  ): Promise<T> {
    const staleEntry = this.getStale<T>(key);
    if (staleEntry) {
      if (staleEntry.isStale && backgroundRefresh && env.enableStaleWhileRevalidate) {
        const pending = this.inFlight.get(key);
        if (!pending) {
          const refreshPromise = backgroundRefresh(staleEntry.value)
            .then((value) => {
              this.set(key, value);
              return value;
            })
            .catch(() => {})
            .finally(() => {
              this.inFlight.delete(key);
            });
          this.inFlight.set(key, refreshPromise);
        }
      }
      return staleEntry.value;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = (async () => {
      try {
        const value = await factory();
        this.set(key, value);
        return value;
      } catch (err) {
        this.stats.errors++;
        metrics.recordCacheError();
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  get size(): number {
    return this.store.size;
  }

  getStats(): CacheStats & { size: number; hitRatio: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.store.size,
      hitRatio: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
    };
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0, errors: 0, staleResponses: 0 };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.store.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

export const cacheService = new CacheService();

export const cacheKeys = {
  musicSearch: (query: string, page: number, limit: number) =>
    `music:search:${query}:${page}:${limit}`,
  musicFeed: (page: number, limit: number) =>
    `music:feed:${page}:${limit}`,
  songById: (songId: string) =>
    `music:song:${songId}`,
  providerHealth: (provider: string) =>
    `provider:health:${provider}`,
} as const;
