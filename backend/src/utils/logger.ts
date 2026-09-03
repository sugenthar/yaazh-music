import { sanitizeLogFields } from "./helpers";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

const shouldLog = (level: LogLevel): boolean => {
  if (process.env.NODE_ENV === "test" && level !== "error") return false;
  return LOG_ORDER[level] >= LOG_ORDER[configuredLevel];
};

const emit = (level: LogLevel, msg: string, fields: Record<string, unknown>) => {
  if (!shouldLog(level)) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...sanitizeLogFields(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  debug: (msg: string, fields: Record<string, unknown> = {}) => emit("debug", msg, fields),
  info: (msg: string, fields: Record<string, unknown> = {}) => emit("info", msg, fields),
  warn: (msg: string, fields: Record<string, unknown> = {}) => emit("warn", msg, fields),
  error: (msg: string, fields: Record<string, unknown> = {}) => emit("error", msg, fields),

  request: (
    fields: {
      method: string;
      path: string;
      requestId?: string;
      status?: number;
      latencyMs?: number;
      userId?: number;
      provider?: string;
      providerLatencyMs?: number;
      cacheHit?: boolean;
      errorCode?: string;
    }
  ) => {
    emit("info", "http.request", fields as unknown as Record<string, unknown>);
  },
};