import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  code: string;
  retryable?: boolean;
  cause?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    options?: { retryable?: boolean; cause?: unknown }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = options?.retryable;
    this.cause = options?.cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "INVALID_REQUEST");
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

export class ProviderUnavailableError extends AppError {
  constructor(message = "Music service is temporarily unavailable.") {
    super(message, 503, "MUSIC_PROVIDER_UNAVAILABLE", { retryable: true });
  }
}

export class RateLimitError extends AppError {
  retryAfterSeconds: number;
  constructor(message = "Too many requests", retryAfterSeconds = 60) {
    super(message, 429, "RATE_LIMITED", { retryable: true });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ProviderError extends AppError {
  constructor(message = "Provider error") {
    super(message, 502, "PROVIDER_ERROR", { retryable: true });
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database error") {
    super(message, 500, "DATABASE_ERROR");
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500, "INTERNAL_ERROR");
  }
}

export const ok = (res: Response, data: unknown, status = 200) => {
  return res.status(status).json({ success: true, data });
};

export const fail = (res: Response, message: string, code: string, status: number) => {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|api[_-]?key|jwt|cookie|refresh)/i;

export const sanitizeErrorDetail = (value: unknown): unknown => {
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}...`;
    return value;
  }
  return value;
};

export const sanitizeLogFields = (
  fields: Record<string, unknown>
): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY_PATTERN.test(key) && value !== undefined && value !== null) {
      safe[key] = typeof value === "string" && value.length > 0 ? "[REDACTED]" : value;
    } else {
      safe[key] = sanitizeErrorDetail(value);
    }
  }
  return safe;
};
