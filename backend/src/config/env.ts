import dotenv from "dotenv";
import { z } from "zod";
import { randomUUID } from "crypto";

dotenv.config();

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
};

const envSchema = z.object({
  port: z.number().int().min(1).max(65535),
  nodeEnv: z.enum(["development", "test", "production"]),
  dbPath: z.string().min(1),
  jwtSecret: z.string().min(1),
  jwtExpiresIn: z.string().min(1),
  bcryptRounds: z.number().int().min(4).max(15).default(10),
  audiusApiBaseUrl: z.string().url(),
  audiusApiKey: z.string().optional(),
  corsOrigin: z.string().default("*"),
  githubSongsUrl: z.string().default(""),
  githubSongsDefault: z.string().default(""),
  cacheTtlMs: z.number().int().positive().default(5 * 60 * 1000),
  cacheStaleTtlMs: z.number().int().positive().default(30 * 60 * 1000),
  cacheMaxSize: z.number().int().positive().default(1000),
  requestTimeoutMs: z.number().int().positive().default(15_000),
  maxRetries: z.number().int().min(0).default(2),
  providerCooldownMs: z.number().int().positive().default(30_000),
  providerFailureThreshold: z.number().int().positive().default(3),
  rateLimitGeneralMax: z.number().int().positive().default(1000),
  rateLimitWindowMs: z.number().int().positive().default(15 * 60 * 1000),
  rateLimitAuthMax: z.number().int().positive().default(20),
  rateLimitSearchMax: z.number().int().positive().default(100),
  maxBodyBytes: z.number().int().positive().default(1_000_000),
  enableStaleWhileRevalidate: z.boolean().default(true),
  appName: z.string().default("yaazh-music"),
  requestIdHeader: z.string().default("x-request-id"),
  shutdownTimeoutMs: z.number().int().positive().default(10_000),
  enableCompression: z.boolean().default(true),
  passwordMinLength: z.number().int().min(6).max(64).default(6),
  jwtAlgorithm: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),
  historyMaxEntries: z.number().int().positive().default(500),
  trustProxy: z.boolean().default(false),
  trustProxyHopCount: z.number().int().min(1).max(5).default(1),
  rateLimitAuthWindowMs: z.number().int().positive().default(15 * 60 * 1000),
  rateLimitSearchWindowMs: z.number().int().positive().default(15 * 60 * 1000),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  redisUrl: z.string().optional(),
  redisKeyPrefix: z.string().min(1).max(64).default("yaazh"),
  redisConnectTimeoutMs: z.number().int().positive().default(2000),
  redisCommandTimeoutMs: z.number().int().positive().default(2000),
  instanceId: z.string().min(1).max(128),
  workerConcurrency: z.number().int().positive().default(4),
  workerPollIntervalMs: z.number().int().positive().default(1000),
  workerRetryMax: z.number().int().min(0).default(3),
  backupDir: z.string().min(1).default("data/backups"),
  backupRetentionDays: z.number().int().positive().default(7),
  backupIntervalHours: z.number().int().positive().default(24),
});

const raw = {
  port: toInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  dbPath: process.env.DB_PATH || "data/yaazh.db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-do-not-use-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 10),
  audiusApiBaseUrl:
    process.env.AUDIUS_API_BASE_URL || "https://api.audius.co",
  audiusApiKey: process.env.AUDIUS_API_KEY || undefined,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  githubSongsUrl: process.env.GITHUB_SONGS_URL || "",
  githubSongsDefault: process.env.GITHUB_SONGS_DEFAULT || "",
  cacheTtlMs: toInt(process.env.CACHE_TTL_MS, 5 * 60 * 1000),
  cacheStaleTtlMs: toInt(process.env.CACHE_STALE_TTL_MS, 30 * 60 * 1000),
  cacheMaxSize: toInt(process.env.CACHE_MAX_SIZE, 1000),
  requestTimeoutMs: toInt(process.env.REQUEST_TIMEOUT_MS, 15_000),
  maxRetries: toInt(process.env.MAX_RETRIES, 2),
  providerCooldownMs: toInt(process.env.PROVIDER_COOLDOWN_MS, 30_000),
  providerFailureThreshold: toInt(process.env.PROVIDER_FAILURE_THRESHOLD, 3),
  rateLimitGeneralMax: toInt(process.env.RATE_LIMIT_GENERAL_MAX, 1000),
  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitAuthMax: toInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  rateLimitSearchMax: toInt(process.env.RATE_LIMIT_SEARCH_MAX, 100),
  maxBodyBytes: toInt(process.env.MAX_BODY_BYTES, 1_000_000),
  enableStaleWhileRevalidate: toBool(process.env.ENABLE_STALE_WHILE_REVALIDATE, true),
  appName: process.env.APP_NAME || "yaazh-music",
  requestIdHeader: process.env.REQUEST_ID_HEADER || "x-request-id",
  shutdownTimeoutMs: toInt(process.env.SHUTDOWN_TIMEOUT_MS, 10_000),
  enableCompression: toBool(process.env.ENABLE_COMPRESSION, true),
  passwordMinLength: toInt(process.env.PASSWORD_MIN_LENGTH, 6),
  jwtAlgorithm: (process.env.JWT_ALGORITHM as "HS256" | "HS384" | "HS512") || "HS256",
  historyMaxEntries: toInt(process.env.HISTORY_MAX_ENTRIES, 500),
  trustProxy: toBool(process.env.TRUST_PROXY, false),
  trustProxyHopCount: toInt(process.env.TRUST_PROXY_HOP_COUNT, 1),
  rateLimitAuthWindowMs: toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
  rateLimitSearchWindowMs: toInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS, 15 * 60 * 1000),
  logLevel: (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "info",
  redisUrl: process.env.REDIS_URL || undefined,
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX || "yaazh",
  redisConnectTimeoutMs: toInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 2000),
  redisCommandTimeoutMs: toInt(process.env.REDIS_COMMAND_TIMEOUT_MS, 2000),
  instanceId: process.env.INSTANCE_ID || `api-${randomUUID().split("-")[0]}`,
  workerConcurrency: toInt(process.env.WORKER_CONCURRENCY, 4),
  workerPollIntervalMs: toInt(process.env.WORKER_POLL_INTERVAL_MS, 1000),
  workerRetryMax: toInt(process.env.WORKER_RETRY_MAX, 3),
  backupDir: process.env.BACKUP_DIR || "data/backups",
  backupRetentionDays: toInt(process.env.BACKUP_RETENTION_DAYS, 7),
  backupIntervalHours: toInt(process.env.BACKUP_INTERVAL_HOURS, 24),
};

const parsed = envSchema.safeParse(raw);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

const env = {
  port: parsed.data.port,
  nodeEnv: parsed.data.nodeEnv,
  dbPath: parsed.data.dbPath,
  jwtSecret: parsed.data.jwtSecret,
  jwtExpiresIn: parsed.data.jwtExpiresIn,
  bcryptRounds: parsed.data.bcryptRounds,
  audiusApiBaseUrl: parsed.data.audiusApiBaseUrl,
  audiusApiKey: parsed.data.audiusApiKey,
  corsOrigin: parsed.data.corsOrigin,
  githubSongsUrl: parsed.data.githubSongsUrl,
  githubSongsDefault: parsed.data.githubSongsDefault,
  cacheTtlMs: parsed.data.cacheTtlMs,
  cacheStaleTtlMs: parsed.data.cacheStaleTtlMs,
  cacheMaxSize: parsed.data.cacheMaxSize,
  requestTimeoutMs: parsed.data.requestTimeoutMs,
  maxRetries: parsed.data.maxRetries,
  providerCooldownMs: parsed.data.providerCooldownMs,
  providerFailureThreshold: parsed.data.providerFailureThreshold,
  rateLimitGeneralMax: parsed.data.rateLimitGeneralMax,
  rateLimitWindowMs: parsed.data.rateLimitWindowMs,
  rateLimitAuthMax: parsed.data.rateLimitAuthMax,
  rateLimitSearchMax: parsed.data.rateLimitSearchMax,
  maxBodyBytes: parsed.data.maxBodyBytes,
  enableStaleWhileRevalidate: parsed.data.enableStaleWhileRevalidate,
  appName: parsed.data.appName,
  requestIdHeader: parsed.data.requestIdHeader,
  shutdownTimeoutMs: parsed.data.shutdownTimeoutMs,
  enableCompression: parsed.data.enableCompression,
  passwordMinLength: parsed.data.passwordMinLength,
  jwtAlgorithm: parsed.data.jwtAlgorithm,
  historyMaxEntries: parsed.data.historyMaxEntries,
  trustProxy: parsed.data.trustProxy,
  trustProxyHopCount: parsed.data.trustProxyHopCount,
  rateLimitAuthWindowMs: parsed.data.rateLimitAuthWindowMs,
  rateLimitSearchWindowMs: parsed.data.rateLimitSearchWindowMs,
  logLevel: parsed.data.logLevel,
  redisUrl: parsed.data.redisUrl,
  redisKeyPrefix: parsed.data.redisKeyPrefix,
  redisConnectTimeoutMs: parsed.data.redisConnectTimeoutMs,
  redisCommandTimeoutMs: parsed.data.redisCommandTimeoutMs,
  instanceId: parsed.data.instanceId,
  workerConcurrency: parsed.data.workerConcurrency,
  workerPollIntervalMs: parsed.data.workerPollIntervalMs,
  workerRetryMax: parsed.data.workerRetryMax,
  backupDir: parsed.data.backupDir,
  backupRetentionDays: parsed.data.backupRetentionDays,
  backupIntervalHours: parsed.data.backupIntervalHours,
};

if (env.nodeEnv === "production" && env.jwtSecret === "dev-secret-do-not-use-in-production") {
  throw new Error("JWT_SECRET must be configured in production");
}

export default env;