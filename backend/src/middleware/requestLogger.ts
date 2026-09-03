import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
    const latencyMs = Date.now() - start;
    const skipLogging = req.path === "/health" || req.path === "/ready";
    if (!skipLogging) {
      logger.info("http.request", {
        requestId: (req as Request & { id?: string }).id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        latencyMs,
      });
    }
    return originalEnd.apply(this, args);
  } as typeof originalEnd;
  next();
};
