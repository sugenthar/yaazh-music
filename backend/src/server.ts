import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import env from "./config/env";
import { initDb, closeDb, validateDb } from "./config/database";
import routes from "./routes";
import { getLibrary } from "./controllers/likeController";
import { searchAll } from "./controllers/songController";
import musicRoutes from "./modules/music/music.routes";
import { requireAuth } from "./middleware/auth";
import { validateQuery } from "./middleware/validate";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestId as requestIdMiddleware } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { ok } from "./utils/helpers";
import { searchQuerySchema } from "./validations/schemas";
import { logger } from "./utils/logger";
import { cacheService, cacheKeys } from "./services/cache";
import { providerManager } from "./modules/music/providerManager";
import { audiusProvider } from "./modules/music/providers/audius.provider";
import { GitHubProvider } from "./modules/music/providers/github.provider";
import { DemoProvider } from "./modules/music/providers/demo.provider";
import { metrics } from "./services/metrics";
import { publicCacheHeaders, noCacheHeaders } from "./middleware/cacheHeaders";
import { createRateLimitStore } from "./rateLimit/store";
import { connectRedis, closeRedis, getRedisStatus } from "./config/redis";
import { createRedisCacheAdapter } from "./services/cache/redisAdapter";
import { startWorker, workerManager } from "./workers";
import { shutdown, isReady } from "./lifecycle";
import { setupHealthChecks, stopHealthChecks } from "./healthMonitor";
import { setupBackupSchedule, stopBackupSchedule, createBackupWithRotation } from "./services/backup";

export const VERSION = "1.3.0";

const registerProviders = (): void => {
  providerManager.register(audiusProvider);
  providerManager.register(new GitHubProvider());
  providerManager.register(new DemoProvider());
};

const createApp = (): Express => {
  const app = express();

  initDb();
  registerProviders();

  app.disable("x-powered-by");
  app.use(helmet());

  // Trust proxy is configured from an explicit hop count, never blindly 'true'.
  if (env.trustProxy) {
    app.set("trust proxy", env.trustProxyHopCount);
  }

  app.use(requestIdMiddleware);

  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
      credentials: env.corsOrigin !== "*",
    })
  );

  if (env.enableCompression) {
    app.use(compression());
  }

  app.use(express.json({ limit: env.maxBodyBytes }));
  app.use(express.urlencoded({ extended: true, limit: env.maxBodyBytes }));

  // Distributed rate limiters — each uses its own store (Redis-backed when
  // available, falling back to memory). Auth limiter first (tighter window).
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: env.rateLimitAuthWindowMs,
      max: env.rateLimitAuthMax,
      standardHeaders: true,
      legacyHeaders: false,
      store: createRateLimitStore(),
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many authentication requests" },
      },
    })
  );

  app.use(
    rateLimit({
      windowMs: env.rateLimitSearchWindowMs,
      max: env.rateLimitSearchMax,
      standardHeaders: true,
      legacyHeaders: false,
      store: createRateLimitStore(),
      skip: (req) => {
        const path = req.path;
        return !(
          path.startsWith("/api/search") ||
          path.startsWith("/api/songs/search") ||
          (path.startsWith("/api/music") && path.endsWith("/search"))
        );
      },
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many search requests" },
      },
    })
  );

  app.use(
    "/api",
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitGeneralMax,
      standardHeaders: true,
      legacyHeaders: false,
      store: createRateLimitStore(),
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      },
    })
  );

  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    const dbOk = validateDb();
    const redis = getRedisStatus();
    const serviceOk = true;
    const healthy = dbOk && serviceOk;
    ok(
      res,
      {
        status: healthy ? "ok" : "degraded",
        service: "yaazh-music-backend",
        instanceId: env.instanceId,
        version: VERSION,
        timestamp: new Date().toISOString(),
        database: dbOk ? "ok" : "degraded",
        cache: redis.configured ? (redis.connected ? "ok" : "memory-fallback") : "memory",
      },
      healthy ? 200 : 503
    );
  });

  app.get("/ready", async (_req: Request, res: Response) => {
    if (!isReady()) {
      return res.status(503).json({
        success: false,
        error: { code: "NOT_READY", message: "Instance is shutting down" },
      });
    }

    const dbOk = validateDb();
    const redis = getRedisStatus();
    const providerStatuses = await providerManager.health().catch(
      () => [] as {
        name: string;
        priority: number;
        circuitState: string;
        isAvailable: boolean;
        stats: Record<string, unknown>;
      }[]
    );
    const anyProviderAvailable = providerStatuses.some(
      (p) => p.isAvailable || p.circuitState === "closed" || p.circuitState === "half-open"
    );

    const cacheReady = !redis.configured || redis.connected || redis.status === "failed";
    if (dbOk && anyProviderAvailable && cacheReady) {
      ok(res, {
        status: "ready",
        instanceId: env.instanceId,
        timestamp: new Date().toISOString(),
        cache: redis.configured ? (redis.connected ? "redis" : "memory-fallback") : "memory",
        providers: providerStatuses.map((p) => ({
          name: p.name,
          available: p.isAvailable,
          circuitState: p.circuitState,
        })),
      });
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: "NOT_READY",
          message: "Service is not ready",
          details: {
            instanceId: env.instanceId,
            database: dbOk ? "ok" : "degraded",
            cache: redis.configured ? (redis.connected ? "redis" : "memory-fallback") : "memory",
            providers: providerStatuses.map((p) => ({
              name: p.name,
              available: p.isAvailable,
              circuitState: p.circuitState,
            })),
          },
        },
      });
    }
  });

  app.get(
    "/api/metrics",
    requireAuth,
    (_req: Request, res: Response) => {
      const snapshot = metrics.getSnapshot();
      const cacheStats = cacheService.getStats();
      const redis = getRedisStatus();
      ok(res, {
        metrics: snapshot,
        cache: cacheStats,
        redis,
        workers: workerManager.getMetrics(),
      });
    }
  );

  app.get("/api/search", publicCacheHeaders, validateQuery(searchQuerySchema), searchAll);

  app.use("/api/music", publicCacheHeaders, musicRoutes);

  app.get("/api/library", noCacheHeaders, requireAuth, getLibrary);

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const startServer = async () => {
  initDb();

  // Connect to Redis if configured. On failure we continue in memory-only mode.
  const redisConnected = await connectRedis();

  const redisAdapter = createRedisCacheAdapter(`${env.redisKeyPrefix}:cache:`);
  if (redisAdapter) {
    cacheService.attachShared(redisAdapter);
    logger.info("cache.shared.attached", {
      adapter: "redis",
      instanceId: env.instanceId,
    });
  }

  registerProviders();
  setupHealthChecks();
  setupBackupSchedule();
  createBackupWithRotation().catch((err) => {
    logger.warn("backup.initial.failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  });

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info("server.started", {
      port: env.port,
      version: VERSION,
      nodeEnv: env.nodeEnv,
      instanceId: env.instanceId,
      redis: redisConnected ? "connected" : "not-available",
    });
  });

  // Start the background worker (memory queue in tests / redis queue when configured)
  startWorker();

  let shuttingDown = false;

  const onShutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    const closeHttpServer = (): Promise<void> =>
      new Promise((resolve) => {
        stopHealthChecks();
        stopBackupSchedule();
        server.close(() => resolve());
      });

    shutdown({ closeHttpServer, signal });
  };

  process.on("SIGINT", () => onShutdown("SIGINT"));
  process.on("SIGTERM", () => onShutdown("SIGTERM"));

  return server;
};

if (require.main === module) {
  startServer();
}

export { createApp, startServer, closeDb };
