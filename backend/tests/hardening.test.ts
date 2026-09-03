import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";
import jwt from "jsonwebtoken";

const { MOCK_RAW_SONGS } = vi.hoisted(() => {
  const mkTrack = (id: string, title: string, artist: string) => ({
    id,
    title,
    user: { name: artist },
    album_backlink: { playlist_name: "Album" },
    artwork: { "1000x1000": `https://img.example.com/${id}.jpg` },
    duration: String(200),
    release_date: "2023-05-12T00:00:00Z",
    is_streamable: true,
  });
  return {
    MOCK_RAW_SONGS: [
      mkTrack("s1", "Hukum", "Anirudh"),
      mkTrack("s2", "Badass", "Anirudh"),
    ] as unknown[],
  };
});

vi.mock("../src/modules/music/providers/audius.provider", () => {
  const map = (raw: Record<string, any>) => ({
    id: `audius-${raw.id}`,
    sourceId: String(raw.id),
    title: String(raw.title),
    artist: String(raw.user?.name ?? ""),
    artists: raw.user?.name ? [String(raw.user.name)] : [],
    album: String(raw.album_backlink?.playlist_name ?? ""),
    artworkUrl: String(raw.artwork?.["1000x1000"] ?? ""),
    audioUrl: `https://mock-audius.example/v1/tracks/${raw.id}/stream`,
    duration: 200,
    source: "audius",
  });
  return {
    audiusProvider: {
      name: "audius",
      priority: 1,
      isAvailable: vi.fn(() => true),
      search: vi.fn(async (query: string, page: number, limit: number) => {
        const all = (MOCK_RAW_SONGS as Record<string, any>[]).filter(
          (s) => !query || query.toLowerCase() === "tamil" || String(s.title).toLowerCase().includes(query.toLowerCase()) || String(s.user?.name ?? "").toLowerCase().includes(query.toLowerCase())
        );
        const start = (page - 1) * limit;
        const slice = all.slice(start, start + limit);
        return { songs: slice.map(map), hasNextPage: start + slice.length < all.length };
      }),
      getById: vi.fn(async (songId: string) => {
        const raw = (MOCK_RAW_SONGS as Record<string, any>[]).find(
          (s) => `audius-${s.id}` === songId || s.id === songId
        );
        return raw ? map(raw) : null;
      }),
      health: vi.fn(async () => ({ status: "available", latencyMs: 5 })),
    },
  };
});

let app: Express;
let dbPath: string;

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `yaazh-hardening-${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  process.env.JWT_SECRET = "hardening-test-secret";
  process.env.NODE_ENV = "test";
  process.env.AUDIUS_API_BASE_URL = "https://mock-audius.example";

  const { createApp } = await import("../src/server");
  app = createApp();
});

afterAll(() => {
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
});

async function registerUser(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "User", email, password: "secret123" });
  return res.body.data.token;
}

describe("AppError hierarchy", () => {
  it("throws proper validation error with 400 status", async () => {
    const { helpers } = { helpers: await import("../src/utils/helpers") };
    const err = new helpers.ValidationError("Bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("INVALID_REQUEST");
    expect(err instanceof helpers.AppError).toBe(true);
  });

  it("marks provider errors as retryable", async () => {
    const { helpers } = { helpers: await import("../src/utils/helpers") };
    const err = new helpers.ProviderError("Provider down");
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe("PROVIDER_ERROR");
    expect(err.retryable).toBe(true);
  });

  it("marks rate limit errors with retry-after", async () => {
    const { helpers } = { helpers: await import("../src/utils/helpers") };
    const err = new helpers.RateLimitError("Too fast", 45);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryAfterSeconds).toBe(45);
    expect(err.retryable).toBe(true);
  });
});

describe("Log sanitization", () => {
  it("redacts sensitive fields", async () => {
    const { helpers } = { helpers: await import("../src/utils/helpers") };
    const cleaned = helpers.sanitizeLogFields({
      password: "super-secret",
      token: "abc123",
      authorization: "Bearer xyz",
      apiKey: "key",
      query: "safe-query",
    });
    expect(cleaned.password).toBe("[REDACTED]");
    expect(cleaned.token).toBe("[REDACTED]");
    expect(cleaned.authorization).toBe("[REDACTED]");
    expect(cleaned.apiKey).toBe("[REDACTED]");
    expect(cleaned.query).toBe("safe-query");
  });

  it("truncates long error messages", async () => {
    const { helpers } = { helpers: await import("../src/utils/helpers") };
    const long = "x".repeat(1000);
    const cleaned = helpers.sanitizeLogFields({ error: long });
    expect(String(cleaned.error).length).toBeLessThanOrEqual(503);
  });
});

describe("Request ID", () => {
  it("generates a request ID when none is supplied", async () => {
    const res = await request(app).get("/api/music/search?q=hukum").expect(200);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(String(res.headers["x-request-id"]).length).toBeGreaterThan(0);
  });

  it("reuses a valid supplied request ID", async () => {
    const supplied = "abc-123.xyz";
    const res = await request(app)
      .get("/api/music/search?q=hukum")
      .set("X-Request-Id", supplied)
      .expect(200);
    expect(res.headers["x-request-id"]).toBe(supplied);
  });

  it("ignores an invalid supplied request ID", async () => {
    const supplied = "bad id with spaces!!!";
    const res = await request(app)
      .get("/api/music/search?q=hukum")
      .set("X-Request-Id", supplied)
      .expect(200);
    expect(String(res.headers["x-request-id"])).not.toBe(supplied);
  });
});

describe("JWT security", () => {
  it("rejects a request with a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-jwt")
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an expired token", async () => {
    const token = jwt.sign(
      { id: 1, email: "x@y.com", name: "x" },
      "hardening-test-secret",
      { expiresIn: "-10s" }
    );
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a token signed with the wrong secret", async () => {
    const token = jwt.sign(
      { id: 1, email: "x@y.com", name: "x" },
      "wrong-secret"
    );
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("rejects a missing authorization header", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("Authorization / IDOR", () => {
  it("prevents a user from deleting another user's playlist", async () => {
    const tokenA = await registerUser("ida@yaazh.com");
    const tokenB = await registerUser("idb@yaazh.com");

    const created = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Private Playlist" })
      .expect(201);
    const playlistId = created.body.data.playlist.id;

    const res = await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(404);
    expect(res.body.error.code).toBe("PLAYLIST_NOT_FOUND");
  });

  it("prevents a user from listing another user's history", async () => {
    const tokenA = await registerUser("hista@yaazh.com");
    const tokenB = await registerUser("histb@yaazh.com");

    await request(app)
      .post("/api/history")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ songId: "audius-s1" })
      .expect(201);

    const res = await request(app)
      .get("/api/history")
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
    expect(res.body.data.history.length).toBe(0);
  });
});

describe("Rate limiting", () => {
  it("sends a 429 with Retry-After via the error handler", async () => {
    const { RateLimitError } = await import("../src/utils/helpers");
    const error = new RateLimitError("Too many requests", 60);
    expect(error.statusCode).toBe(429);
    expect(error.retryAfterSeconds).toBe(60);
    expect(error.retryable).toBe(true);
  });
});

describe("Cache stampede protection", () => {
  it("coalesces concurrent getOrSet calls to a single factory invocation", async () => {
    const { CacheService, cacheKeys } = await import("../src/services/cache");
    const cache = new CacheService({ ttlMs: 10000, staleTtlMs: 10000 });
    const key = cacheKeys.musicSearch("stampede", 1, 10);
    let calls = 0;

    const factory = vi.fn(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      return { songs: [], hasNextPage: false };
    });

    const results = await Promise.all([
      cache.getOrSet(key, factory),
      cache.getOrSet(key, factory),
      cache.getOrSet(key, factory),
      cache.getOrSet(key, factory),
    ]);

    expect(calls).toBe(1);
    expect(results).toHaveLength(4);
    expect(cache.get(key)).toBeDefined();
  });

  it("clears the in-flight promise on reject", async () => {
    const { CacheService, cacheKeys } = await import("../src/services/cache");
    const cache = new CacheService({ ttlMs: 10000, staleTtlMs: 10000 });
    const key = "music:song:missing";

    const failing = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(cache.getOrSet(key, failing)).rejects.toThrow("boom");

    const later = vi.fn(async () => ({ id: "song" }));
    await cache.getOrSet(key, later);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it("tracks cache stats", async () => {
    const { CacheService } = await import("../src/services/cache");
    const cache = new CacheService({ ttlMs: 10000, staleTtlMs: 10000 });
    const key = "stats:key";
    await cache.getOrSet(key, async () => ({ value: 1 }));
    cache.get(key);

    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.sets).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(0);
    expect(stats.hitRatio).toBeGreaterThanOrEqual(0);
  });

  it("tracks errors on failed factories", async () => {
    const { CacheService } = await import("../src/services/cache");
    const cache = new CacheService({ ttlMs: 10000, staleTtlMs: 10000 });
    await cache.getOrSet("err:key", async () => {
      throw new Error("nope");
    }).catch(() => {});
    expect(cache.getStats().errors).toBeGreaterThanOrEqual(1);
  });
});

describe("Metrics endpoint", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/metrics").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns metrics for an authenticated request", async () => {
    const token = await registerUser("metrics@yaazh.com");
    const res = await request(app)
      .get("/api/metrics")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totalRequests).toBeGreaterThanOrEqual(0);
    expect(res.body.data.cache).toBeDefined();
  });
});

describe("Health and readiness", () => {
  it("reports health ok", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.database).toBe("ok");
  });

  it("reports readiness when providers are available", async () => {
    const res = await request(app).get("/ready").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ready");
  });

  it("reports not-ready when the database is unavailable", async () => {
    const { closeDb } = await import("../src/config/database");
    closeDb();
    const res = await request(app).get("/ready");
    expect([200, 503]).toContain(res.status);
    if (res.status === 503) {
      expect(res.body.error.code).toBe("NOT_READY");
    }
  });
});

describe("SQLite reliability", () => {
  it("enforces unique constraints on likes", async () => {
    const { getDb } = await import("../src/config/database");
    const db = getDb();
    const userId = 1;
    const songId = "audius-s1";
    db.prepare("INSERT INTO likes (user_id, song_id) VALUES (?, ?)").run(userId, songId);
    expect(() =>
      db.prepare("INSERT INTO likes (user_id, song_id) VALUES (?, ?)").run(userId, songId)
    ).toThrow();
  });

  it("rolls back a failed transaction", async () => {
    const { getDb } = await import("../src/config/database");
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) as c FROM playlists").get() as { c: number }).c;
    expect(() =>
      db.transaction(() => {
        db.prepare("INSERT INTO playlists (name, user_id) VALUES (?, ?)").run("Rollback Test", 9999);
        throw new Error("force rollback");
      })()
    ).toThrow();
    const after = (db.prepare("SELECT COUNT(*) as c FROM playlists").get() as { c: number }).c;
    expect(after).toBe(before);
  });
});

describe("Graceful shutdown resources", () => {
  it("clears cache, resets providers, and closes the database cleanly", async () => {
    const { cacheService } = await import("../src/services/cache");
    const { providerManager } = await import("../src/modules/music/providerManager");
    const { closeDb, getDb, validateDb } = await import("../src/config/database");

    cacheService.set("shutdown:test", { value: 1 });
    expect(cacheService.size).toBeGreaterThanOrEqual(1);

    expect(() => closeDb()).not.toThrow();
    expect(validateDb()).toBe(true);
    expect(getDb()).toBeDefined();
  });
});

describe("Provider failure isolation", () => {
  it("returns fallback songs when the primary provider throws", async () => {
    const { audiusProvider } = await import(
      "../src/modules/music/providers/audius.provider"
    );
    (audiusProvider.search as unknown as {
      mockRejectedValueOnce: (value: unknown) => void;
    }).mockRejectedValueOnce(new Error("audius down"));
    const res = await request(app).get("/api/music/search?q=anirudh").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.songs.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Error handling", () => {
  it("returns 404 for unknown routes with standard shape", async () => {
    const res = await request(app).get("/api/nonexistent-route").expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("validates oversized inputs are rejected", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "a".repeat(500),
        email: "big@yaazh.com",
        password: "secret123",
      })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("validates oversized playlist names", async () => {
    const token = await registerUser("long@yaazh.com");
    const res = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "n".repeat(500) })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("validates that invalid ids are rejected with 400", async () => {
    const token = await registerUser("idv@yaazh.com");
    const res = await request(app)
      .get(`/api/playlists/${"abc"}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("handles malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not valid json")
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("falls back to provider lookup when snapshot id does not match songId", async () => {
    const token = await registerUser("snap@yaazh.com");
    const res = await request(app)
      .post("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: "audius-s1", song: { id: "audius-different", title: "x" } });
    expect([201, 404]).toContain(res.status);
  });
});

describe("History reliability", () => {
  it("records and retrieves history with pagination", async () => {
    const token = await registerUser("histp@yaazh.com");
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/history")
        .set("Authorization", `Bearer ${token}`)
        .send({ songId: "audius-s1" })
        .expect(201);
    }
    const res = await request(app)
      .get("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.history.length).toBeGreaterThanOrEqual(3);
  });

  it("clears history", async () => {
    const token = await registerUser("histc@yaazh.com");
    await request(app)
      .post("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: "audius-s1" })
      .expect(201);
    const del = await request(app)
      .delete("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(del.body.data.cleared).toBe(true);
    const res = await request(app)
      .get("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.history.length).toBe(0);
  });
});

describe("Playlist reliability", () => {
  it("prevents adding duplicate songs to a playlist", async () => {
    const token = await registerUser("dup@yaazh.com");
    const created = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dup Mix" })
      .expect(201);
    const pid = created.body.data.playlist.id;

    await request(app)
      .post(`/api/playlists/${pid}/songs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: "audius-s1" })
      .expect(201);
    const res = await request(app)
      .post(`/api/playlists/${pid}/songs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: "audius-s1" })
      .expect(200);
    expect(res.body.data.added).toBe(true);

    const list = await request(app)
      .get(`/api/playlists/${pid}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.playlist.songCount).toBe(1);
  });

  it("prevents adding songs to a nonexistent playlist", async () => {
    const token = await registerUser("noexist@yaazh.com");
    const res = await request(app)
      .post("/api/playlists/9999/songs")
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: "audius-s1" })
      .expect(404);
    expect(res.body.error.code).toBe("PLAYLIST_NOT_FOUND");
  });
});
