export interface CacheAdapter {
  /** Get a value by key. Returns undefined if not found or on error. */
  get(key: string): Promise<string | null>;
  /** Set a key with an optional TTL in seconds. Returns true on success. */
  set(key: string, value: string, ttlSeconds?: number): Promise<boolean>;
  /** Delete a key. Returns true if deleted. */
  del(key: string): Promise<boolean>;
  /** Check if key exists. Returns false on miss or error. */
  has(key: string): Promise<boolean>;
  /** Delete all keys matching a pattern. Returns count of deleted keys. */
  invalidate(pattern: string): Promise<number>;
  /** Clear all keys under this adapter's namespace. */
  clear(): Promise<void>;
  /** Number of entries (if determinable), or -1 if unknown. */
  size(): Promise<number>;
  /** Health check. Returns true if adapter is operational. */
  isHealthy(): Promise<boolean>;
  /** Close/destroy the adapter (cleanup connections). */
  close(): Promise<void>;
}
