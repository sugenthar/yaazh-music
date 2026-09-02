type LogLevel = "info" | "warn" | "error";

const emit = (level: LogLevel, msg: string, fields: Record<string, unknown>) => {
  if (level !== "error" && process.env.NODE_ENV === "test") return;
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
};