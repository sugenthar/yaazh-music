import { Request, Response, NextFunction } from "express";
import { AppError, RateLimitError, sanitizeLogFields } from "../utils/helpers";
import { logger } from "../utils/logger";
import { metrics } from "../services/metrics";

interface RequestWithId extends Request {
  id?: string;
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = (req as RequestWithId).id;

  if (err instanceof RateLimitError) {
    metrics.recordRateLimitRejection();
    res.setHeader("Retry-After", String(err.retryAfterSeconds));
    return res.status(429).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("app_error", {
        requestId,
        code: err.code,
        message: err.message,
        status: err.statusCode,
        retryable: err.retryable,
      });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  const parseError = err as { type?: string; status?: number; statusCode?: number };
  if (
    typeof err === "object" &&
    err !== null &&
    (parseError.type === "entity.parse.failed" ||
      parseError.type === "entity.too.large" ||
      parseError.status === 400 ||
      parseError.statusCode === 400)
  ) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_REQUEST", message: "Malformed request body" },
    });
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  ) {
    return res.status(409).json({
      success: false,
      error: { code: "DUPLICATE_RESOURCE", message: "Resource already exists" },
    });
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: string }).code === "string" &&
    (err as { code: string }).code.startsWith("SQLITE")
  ) {
    metrics.recordDatabaseError();
    logger.error("database_error", sanitizeLogFields({
      requestId,
      error: err instanceof Error ? err.message : String(err),
    }));
  }

  logger.error("unhandled_error", sanitizeLogFields({
    requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: process.env.NODE_ENV === "production" ? undefined : err instanceof Error ? err.stack : undefined,
  }));

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err instanceof Error
        ? err.message
        : "Internal server error";

  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message },
  });
};
