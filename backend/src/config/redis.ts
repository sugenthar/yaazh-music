import Redis from "ioredis";
import env from "./env";
import { logger } from "../utils/logger";

let client: Redis | null = null;
let clientStatus: "idle" | "connecting" | "connected" | "failed" | "closed" = "idle";
let lastError: string | null = null;

const REDIS_URL = env.redisUrl;
const CONNECT_TIMEOUT = env.redisConnectTimeoutMs;
const COMMAND_TIMEOUT = env.redisCommandTimeoutMs;

export const isRedisConfigured = (): boolean => !!REDIS_URL;

export const getRedis = (): Redis | null => {
  if (!REDIS_URL) return null;
  if (clientStatus === "connected" || clientStatus === "connecting") return client;
  return null;
};

export const connectRedis = async (): Promise<boolean> => {
  if (!REDIS_URL) {
    logger.info("redis.config_disabled", { reason: "REDIS_URL not set" });
    return false;
  }
  if (client && clientStatus === "connected") return true;

  try {
    clientStatus = "connecting";
    client = new Redis(REDIS_URL, {
      connectTimeout: CONNECT_TIMEOUT,
      commandTimeout: COMMAND_TIMEOUT,
      maxRetriesPerRequest: 1,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    client.on("connect", () => {
      clientStatus = "connected";
      lastError = null;
      logger.info("redis.connected", {
        host: REDIS_URL.replace(/\/\/.*@/, "//***@"),
        prefix: env.redisKeyPrefix,
      });
    });

    client.on("error", (err: Error) => {
      lastError = err.message;
      logger.warn("redis.error", {
        error: err.message,
        status: clientStatus,
      });
    });

    client.on("close", () => {
      clientStatus = "closed";
      logger.info("redis.closed");
    });

    client.on("reconnecting", () => {
      clientStatus = "connecting";
      logger.info("redis.reconnecting");
    });

    await client.connect();
    clientStatus = "connected";
    lastError = null;
    return true;
  } catch (err) {
    clientStatus = "failed";
    lastError = err instanceof Error ? err.message : String(err);
    logger.warn("redis.connect_failed", {
      error: lastError,
      fallback: "memory-only",
    });
    if (client) {
      client.disconnect();
      client = null;
    }
    return false;
  }
};

export const closeRedis = async (): Promise<void> => {
  if (!client) {
    clientStatus = "closed";
    return;
  }
  try {
    clientStatus = "closed";
    await client.quit();
    logger.info("redis.closed_gracefully");
  } catch (err) {
    logger.warn("redis.close_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    try { client.disconnect(); } catch { /* ignore */ }
  }
  client = null;
};

export const getRedisStatus = (): {
  configured: boolean;
  connected: boolean;
  status: string;
  lastError: string | null;
} => ({
  configured: isRedisConfigured(),
  connected: clientStatus === "connected",
  status: clientStatus,
  lastError,
});
