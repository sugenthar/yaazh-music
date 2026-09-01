import dotenv from "dotenv";

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  dbPath: process.env.DB_PATH || "data/yaazh.db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-do-not-use-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "10", 10),
  githubSongsUrl:
    process.env.GITHUB_SONGS_URL ||
    "https://raw.githubusercontent.com/sugenthar/songsData/main/songs/song.json",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

export default env;