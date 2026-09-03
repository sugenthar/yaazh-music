import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
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

  app.use(helmet());
  app.use(requestIdMiddleware);

  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    })
  );

  app.use(express.json({ limit: env.maxBodyBytes }));

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

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.rateLimitAuthMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many authentication requests" },
      },
    })
  );

  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    const dbOk = validateDb();
    ok(res, {
      status: "ok",
      service: "yaazh-music-backend",
      version: "1.3.0",
      timestamp: new Date().toISOString(),
      database: dbOk ? "ok" : "degraded",
    });
  });

  app.get("/ready", (_req: Request, res: Response) => {
    const dbOk = validateDb();
    const ready = dbOk;
    if (ready) {
      ok(res, { status: "ready", timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({
        success: false,
        error: { code: "NOT_READY", message: "Service is not ready" },
      });
    }
  });

  app.get("/api/search", validateQuery(searchQuerySchema), searchAll);

  app.use("/api/music", musicRoutes);

  app.get("/api/library", requireAuth, getLibrary);

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

  const shutdown = (signal: string) => {
    logger.info("server.shutdown.initiated", { signal });

    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

    server.close(() => {
      cacheService.clear();
      providerManager.reset();
      closeDb();
      logger.info("server.shutdown.complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("server.shutdown.timeout", { message: "Forced exit after timeout" });
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

if (require.main === module) {
  startServer();
}

export { createApp, startServer };
