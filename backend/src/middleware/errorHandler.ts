import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/helpers";

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Malformed JSON body / body-parser errors
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

  console.error("Unhandled error:", {
    requestId: (req as Request & { id?: string })?.id,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
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