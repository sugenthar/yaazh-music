import dotenv from "dotenv";

dotenv.config();

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: toInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  dbPath: process.env.DB_PATH || "data/yaazh.db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-do-not-use-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 10),
  audiusApiBaseUrl:
    process.env.AUDIUS_API_BASE_URL || "https://api.audius.co",
  audiusApiKey: process.env.AUDIUS_API_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

if (!env.audiusApiBaseUrl.startsWith("http")) {
  throw new Error("AUDIUS_API_BASE_URL must be a valid http(s) URL");
}

if (
  env.nodeEnv === "production" &&
  env.jwtSecret === "dev-secret-do-not-use-in-production"
) {
  throw new Error("JWT_SECRET must be configured in production");
}

if (env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be a valid network port");
}

export default env;