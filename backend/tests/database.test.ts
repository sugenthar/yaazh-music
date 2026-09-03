import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

describe("SQLite migration system", () => {
  let dbPath: string;

  afterAll(() => {
    for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }
  });

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `yaazh-migrate-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    process.env.JWT_SECRET = "migrate-test-secret";
    process.env.NODE_ENV = "test";
  });

  it("applies migrations on a fresh database and records user_version", async () => {
    vi.resetModules();
    const { getDb } = await import("../src/config/database");
    const db = getDb();
    const version = db.pragma("user_version", { simple: true }) as number;
    expect(version).toBeGreaterThanOrEqual(3);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain("users");
    expect(names).toContain("playlists");
    expect(names).toContain("playlist_songs");
    expect(names).toContain("likes");
    expect(names).toContain("listening_history");
    expect(names).toContain("moods");

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
      .all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain("idx_history_song");
    expect(indexNames).toContain("idx_likes_user_song");
    expect(indexNames).toContain("idx_playlist_songs_playlist");
    expect(indexNames).toContain("idx_playlists_user_created");
  });

  it("is idempotent - re-running migrations does not change state", async () => {
    const { getDb } = await import("../src/config/database");
    const db = getDb();
    const versionBefore = db.pragma("user_version", { simple: true }) as number;
    const tableCountBefore = (db.prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'").get() as { c: number }).c;

    const { runInTransaction } = await import("../src/config/database");
    runInTransaction(() => {});

    const versionAfter = db.pragma("user_version", { simple: true }) as number;
    const tableCountAfter = (db.prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table'").get() as { c: number }).c;
    expect(versionAfter).toBe(versionBefore);
    expect(tableCountAfter).toBe(tableCountBefore);
  });
});

describe("SQLite transaction semantics", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `yaazh-tx-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    process.env.NODE_ENV = "test";
    vi.resetModules();
  });

  afterAll(() => {
    for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch { /* ignore */ }
      }
    }
  });

  it("runInTransaction commits all writes atomically", async () => {
    const { getDb, runInTransaction } = await import("../src/config/database");
    const db = getDb();
    db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run("A", "txa@test.com", "hash");
    const userId = (db.prepare("SELECT id FROM users WHERE email = ?").get("txa@test.com") as { id: number }).id;

    runInTransaction(() => {
      db.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)").run("P1", userId);
      db.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)").run("P2", userId);
    });

    const count = (db.prepare("SELECT COUNT(*) as c FROM playlists WHERE user_id = ?").get(userId) as { c: number }).c;
    expect(count).toBe(2);
  });

  it("runInTransaction rolls back all writes on failure", async () => {
    const { getDb, runInTransaction } = await import("../src/config/database");
    const db = getDb();
    db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run("B", "txb@test.com", "hash");
    const userId = (db.prepare("SELECT id FROM users WHERE email = ?").get("txb@test.com") as { id: number }).id;

    expect(() =>
      runInTransaction(() => {
        db.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)").run("P1", userId);
        db.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)").run("P2", userId);
        throw new Error("mid-transaction failure");
      })
    ).toThrow();

    const count = (db.prepare("SELECT COUNT(*) as c FROM playlists WHERE user_id = ?").get(userId) as { c: number }).c;
    expect(count).toBe(0);
  });

  it("supports pagination queries", async () => {
    const { getDb } = await import("../src/config/database");
    const db = getDb();
    db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run("C", "txc@test.com", "hash");
    const userId = (db.prepare("SELECT id FROM users WHERE email = ?").get("txc@test.com") as { id: number }).id;
    for (let i = 1; i <= 5; i++) {
      db.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)").run(`P${i}`, userId);
    }

    const page1 = db.prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY id LIMIT ? OFFSET ?").all(userId, 2, 0) as unknown[];
    const page2 = db.prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY id LIMIT ? OFFSET ?").all(userId, 2, 2) as unknown[];
    const page3 = db.prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY id LIMIT ? OFFSET ?").all(userId, 2, 4) as unknown[];
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page3).toHaveLength(1);
  });
});
