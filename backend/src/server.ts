import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import env from "./config/env";
import { initDb, closeDb } from "./config/database";
import routes from "./routes";
import { getLibrary } from "./controllers/likeController";
import { searchAll } from "./controllers/songController";
import musicRoutes from "./modules/music/music.routes";
import { requireAuth } from "./middleware/auth";
import { validateQuery } from "./middleware/validate";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestId as requestIdMiddleware } from "./middleware/requestId";
import { ok } from "./utils/helpers";
import { searchQuerySchema } from "./validations/schemas";

const createApp = (): Express => {
  const app = express();

  initDb();

  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    })
  );
  app.use(express.json());

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      },
    })
  );

  app.get("/health", (_req: Request, res: Response) => {
    ok(res, {
      status: "ok",
      service: "yaazh-music-backend",
      version: "1.2.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Dedicated search endpoint: GET /api/search?q=...
  app.get("/api/search", validateQuery(searchQuerySchema), searchAll);

  // Music catalog (Audius-backed): GET /api/music/search?q=&page=&limit=
  app.use("/api/music", musicRoutes);

  // Library endpoint: GET /api/library
  app.get("/api/library", requireAuth, getLibrary);

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

const startServer = () => {
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Yaazh Music API v1.2 listening on http://localhost:${env.port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

if (require.main === module) {
  startServer();
}

export { createApp, startServer };