import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { metrics } from "../services/metrics";
import { AuthRequest } from "./auth";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
    const latencyMs = Date.now() - start;
    const skipLogging = req.path === "/health" || req.path === "/ready";

    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!skipLogging) {
      logger.request({
        requestId: (req as Request & { id?: string }).id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        latencyMs,
        userId,
      });
      metrics.recordRequest(
        `${req.method} ${req.path}`,
        res.statusCode,
        latencyMs
      );
      if (res.statusCode === 401) metrics.recordAuthenticationFailure();
      if (res.statusCode === 429) metrics.recordRateLimitRejection();
    }
    return originalEnd.apply(this, args);
  } as typeof originalEnd;
  next();
};
