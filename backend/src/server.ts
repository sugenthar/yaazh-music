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
import { cacheService } from "./services/cache";
import { providerManager } from "./modules/music/providerManager";
import { audiusProvider } from "./modules/music/providers/audius.provider";
import { GitHubProvider } from "./modules/music/providers/github.provider";
import { DemoProvider } from "./modules/music/providers/demo.provider";
import { cacheKeys } from "./services/cache";
import { metrics } from "./services/metrics";
import { publicCacheHeaders, noCacheHeaders } from "./middleware/cacheHeaders";

const registerProviders = (): void => {
  providerManager.register(audiusProvider);
  providerManager.register(new GitHubProvider());
  providerManager.register(new DemoProvider());
};

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

const startHealthChecks = (): void => {
  healthCheckInterval = setInterval(async () => {
    try {
      await providerManager.health();
    } catch {
      // Health check should never crash the server
    }
  }, 60_000);
  if (healthCheckInterval.unref) healthCheckInterval.unref();
};

const createApp = (): Express => {
  const app = express();

  initDb();
  registerProviders();

  app.disable("x-powered-by");
  app.use(helmet());

  if (env.trustProxy) {
    app.set("trust proxy", true);
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

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: env.rateLimitAuthWindowMs,
      max: env.rateLimitAuthMax,
      standardHeaders: true,
      legacyHeaders: false,
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
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      },
    })
  );

  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    const dbOk = validateDb();
    const serviceOk = true;
    const healthy = dbOk && serviceOk;
    ok(res, {
      status: healthy ? "ok" : "degraded",
      service: "yaazh-music-backend",
      version: "1.3.0",
      timestamp: new Date().toISOString(),
      database: dbOk ? "ok" : "degraded",
    }, healthy ? 200 : 503);
  });

  app.get("/ready", async (_req: Request, res: Response) => {
    const dbOk = validateDb();
    const providerStatuses = await providerManager.health().catch(() => [] as ReturnType<typeof providerManager.health> extends Promise<infer T> ? T : never[]);
    const anyProviderAvailable = providerStatuses.some(
      (p) => p.isAvailable || p.circuitState === "closed" || p.circuitState === "half-open"
    );

    if (dbOk && anyProviderAvailable) {
      ok(res, {
        status: "ready",
        timestamp: new Date().toISOString(),
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
            database: dbOk ? "ok" : "degraded",
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
      ok(res, {
        metrics: snapshot,
        cache: cacheStats,
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

const startServer = () => {
  const app = createApp();
  startHealthChecks();

  const server = app.listen(env.port, () => {
    logger.info("server.started", {
      port: env.port,
      version: "1.3.0",
      nodeEnv: env.nodeEnv,
    });
  });

  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("server.shutdown.initiated", { signal });

    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

    const forceExitTimer = setTimeout(() => {
      logger.error("server.shutdown.timeout", { message: "Forced exit after timeout" });
      process.exit(1);
    }, env.shutdownTimeoutMs);
    forceExitTimer.unref();

    server.close(async () => {
      try {
        cacheService.clear();
        providerManager.reset();
        closeDb();
        logger.info("server.shutdown.complete");
        process.exit(0);
      } catch (err) {
        logger.error("server.shutdown.failed", {
          error: err instanceof Error ? err.message : "unknown",
        });
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

if (require.main === module) {
  startServer();
}

export { createApp, startServer };
