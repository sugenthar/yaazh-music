import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import env from "./env";
import { logger } from "../utils/logger";

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  song_json TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (playlist_id, song_id)
);

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  song_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, song_id)
);

CREATE TABLE IF NOT EXISTS listening_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  song_json TEXT,
  played_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  color TEXT,
  song_title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_song ON likes(song_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_song ON likes(user_id, song_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song ON playlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_played ON listening_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_created ON playlists(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moods_user ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_moods_created ON moods(created_at DESC, id DESC);
`;

const MIGRATE_CATALOG_REMOVAL = `
DROP TABLE IF EXISTS listening_history;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS playlist_songs;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS albums;
DROP TABLE IF EXISTS artists;
`;

export const getDb = (): Database.Database => {
  if (db) return db;

  const dir = path.dirname(env.dbPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(env.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.exec(SCHEMA);

  const version: number = (db.pragma("user_version", { simple: true }) as number) || 0;
  if (version < 2) {
    db.pragma("foreign_keys = OFF");
    db.exec(MIGRATE_CATALOG_REMOVAL);
    db.exec(SCHEMA);
    db.pragma("foreign_keys = ON");
    db.pragma("user_version = 2");
  }

  return db;
};

export const initDb = (): Database.Database => {
  const database = getDb();
  database.exec(SCHEMA);
  return database;
};

export const validateDb = (): boolean => {
  try {
    const database = getDb();
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const requiredTables = ["users", "playlists", "playlist_songs", "likes", "listening_history", "moods"];
    const tableNames = tables.map((t) => t.name);
    for (const required of requiredTables) {
      if (!tableNames.includes(required)) {
        logger.error("database.validation.missing_table", { table: required });
        return false;
      }
    }
    return true;
  } catch (err) {
    logger.error("database.validation.failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
};

export const runInTransaction = <T>(fn: () => T): T => {
  const database = getDb();
  const transaction = database.transaction(fn);
  return transaction();
};

export const closeDb = (): void => {
  if (db) {
    try {
      db.close();
    } catch (err) {
      logger.error("database.close.failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
    db = null;
  }
};
