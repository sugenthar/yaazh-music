type LogLevel = "info" | "warn" | "error";

const shouldLog = (level: LogLevel): boolean => {
  if (process.env.NODE_ENV === "test" && level !== "error") return false;
  return true;
};

const emit = (level: LogLevel, msg: string, fields: Record<string, unknown>) => {
  if (!shouldLog(level)) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  info: (msg: string, fields: Record<string, unknown> = {}) => emit("info", msg, fields),
  warn: (msg: string, fields: Record<string, unknown> = {}) => emit("warn", msg, fields),
  error: (msg: string, fields: Record<string, unknown> = {}) => emit("error", msg, fields),

  request: (req: { method: string; originalUrl: string; id?: string }, status: number, latencyMs: number) => {
    emit("info", "http.request", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status,
      latencyMs,
    });
  },
};
