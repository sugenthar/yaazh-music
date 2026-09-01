import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";

let app: Express;
let dbPath: string;
let songId: number;
let token: string;

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `yaazh-test-${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  process.env.JWT_SECRET = "test-secret";
  process.env.NODE_ENV = "test";

  const { createApp } = await import("../src/server");
  const { getDb } = await import("../src/config/database");
  app = createApp();

  // Seed songs directly (avoid network dependency on GitHub)
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO songs (external_id, title, artist, artwork, url, duration, source)
     VALUES (?, ?, ?, ?, ?, ?, 'test')`
  );
  const r1 = insert.run("seed-1", "Hukum", "Anirudh Ravichander", null, "https://example.com/hukum.mp3", 220);
  insert.run("seed-2", "Badass - Leo", "Anirudh Ravichander", null, "https://example.com/badass.mp3", 210);
  insert.run("seed-3", "Mallipoo", "A.R. Rahman", null, "https://example.com/mallipoo.mp3", 200);
  songId = Number(r1.lastInsertRowid);
});

afterAll(() => {
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
});

describe("Health endpoint", () => {
  it("returns ok with service info", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.version).toBe("1.2.0");
  });
});

describe("Songs API", () => {
  it("GET /api/songs returns the catalog", async () => {
    const res = await request(app).get("/api/songs").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.songs.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /api/songs/:id returns a song", async () => {
    const res = await request(app).get(`/api/songs/${songId}`).expect(200);
    expect(res.body.data.song.title).toBe("Hukum");
  });

  it("GET /api/songs/:id returns 404 for unknown songs", async () => {
    const res = await request(app).get("/api/songs/99999").expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("SONG_NOT_FOUND");
  });

  it("GET /api/songs/abc rejects invalid id", async () => {
    const res = await request(app).get("/api/songs/abc").expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });
});

describe("Search API", () => {
  it("GET /api/search?q= hukum - case insensitive", async () => {
    const res = await request(app).get("/api/search?q=HuKuM").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.songs.length).toBe(1);
    expect(res.body.data.songs[0].title).toBe("Hukum");
  });

  it("searches by artist", async () => {
    const res = await request(app).get("/api/search?q=rahman").expect(200);
    expect(res.body.data.songs.length).toBe(1);
    expect(res.body.data.songs[0].artist).toBe("A.R. Rahman");
  });

  it("missing query returns 400", async () => {
    const res = await request(app).get("/api/search").expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });
});

describe("Authentication", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Jane", email: "jane@yaazh.com", password: "secret123" })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("jane@yaazh.com");
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it("rejects duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Jane2", email: "jane@yaazh.com", password: "secret123" })
      .expect(409);
  });

  it("rejects invalid email on register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bob", email: "not-an-email", password: "secret123" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects short password on register", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bob", email: "bob@yaazh.com", password: "123" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jane@yaazh.com", password: "secret123" })
      .expect(200);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "jane@yaazh.com", password: "wrongpass" })
      .expect(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns me for valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.user.email).toBe("jane@yaazh.com");
  });

  it("rejects me without token", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("does not store plaintext password", async () => {
    const { getDb } = await import("../src/config/database");
    const row = getDb().prepare("SELECT password_hash FROM users WHERE email = ?").get("jane@yaazh.com") as {
      password_hash: string;
    };
    expect(row.password_hash).not.toBe("secret123");
  });
});

describe("Likes & Library", () => {
  it("requires auth to like", async () => {
    const res = await request(app).post(`/api/likes/${songId}`).expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("likes a song", async () => {
    const res = await request(app)
      .post(`/api/likes/${songId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(res.body.data.liked).toBe(true);
  });

  it("does not duplicate a like", async () => {
    const res = await request(app)
      .post(`/api/likes/${songId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.liked).toBe(true);
  });

  it("returns library with liked song", async () => {
    const res = await request(app)
      .get("/api/library")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.likedSongs.some((s: { id: number }) => s.id === songId)).toBe(true);
  });

  it("returns 404 when liking a non-existent song", async () => {
    const res = await request(app)
      .post("/api/likes/99999")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
    expect(res.body.error.code).toBe("SONG_NOT_FOUND");
  });

  it("unlikes a song", async () => {
    const res = await request(app)
      .delete(`/api/likes/${songId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.liked).toBe(false);
  });
});

describe("Playlists", () => {
  it("creates a playlist", async () => {
    const res = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Workout Mix", description: "High energy" })
      .expect(201);
    expect(res.body.data.playlist.name).toBe("Workout Mix");
    expect(res.body.data.playlist.songCount).toBe(0);
  });

  it("rejects empty playlist name", async () => {
    const res = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "   " })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("lists playlists", async () => {
    const res = await request(app)
      .get("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.playlists.some((p: { name: string }) => p.name === "Workout Mix")).toBe(true);
  });

  it("adds a song to a playlist", async () => {
    const { getDb } = await import("../src/config/database");
    const row = getDb()
      .prepare("SELECT id FROM playlists WHERE name = ?")
      .get("Workout Mix") as { id: number };
    const res = await request(app)
      .post(`/api/playlists/${row.id}/songs`)
      .set("Authorization", `Bearer ${token}`)
      .send({ songId })
      .expect(201);
    expect(res.body.data.added).toBe(true);
  });

  it("returns playlist with its songs", async () => {
    const { getDb } = await import("../src/config/database");
    const row = getDb()
      .prepare("SELECT id FROM playlists WHERE name = ?")
      .get("Workout Mix") as { id: number };
    const res = await request(app)
      .get(`/api/playlists/${row.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.playlist.songCount).toBe(1);
  });

  it("renames a playlist", async () => {
    const { getDb } = await import("../src/config/database");
    const row = getDb()
      .prepare("SELECT id FROM playlists WHERE name = ?")
      .get("Workout Mix") as { id: number };
    const res = await request(app)
      .patch(`/api/playlists/${row.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Gym Mix" })
      .expect(200);
    expect(res.body.data.playlist.name).toBe("Gym Mix");
  });

  it("removes a song from a playlist", async () => {
    const { getDb } = await import("../src/config/database");
    const row = getDb()
      .prepare("SELECT id FROM playlists WHERE name = ?")
      .get("Gym Mix") as { id: number };
    await request(app)
      .delete(`/api/playlists/${row.id}/songs/${songId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const res = await request(app)
      .get(`/api/playlists/${row.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.playlist.songCount).toBe(0);
  });

  it("cannot access another user's playlist (404)", async () => {
    // Create a second user
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "Alex", email: "alex@yaazh.com", password: "secret123" })
      .expect(201);
    const otherToken = reg.body.data.token;

    const { getDb } = await import("../src/config/database");
    const row = getDb()
      .prepare("SELECT id FROM playlists WHERE name = ?")
      .get("Gym Mix") as { id: number };

    const res = await request(app)
      .get(`/api/playlists/${row.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
    expect(res.body.error.code).toBe("PLAYLIST_NOT_FOUND");
  });

  it("deletes a playlist", async () => {
    const { getDb } = await import("../src/config/database");
    const row = getDb()
      .prepare("SELECT id FROM playlists WHERE name = ?")
      .get("Gym Mix") as { id: number };
    const res = await request(app)
      .delete(`/api/playlists/${row.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.deleted).toBe(true);
  });
});

describe("History", () => {
  it("requires auth", async () => {
    const res = await request(app)
      .post("/api/history")
      .send({ songId })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("records listening history", async () => {
    const res = await request(app)
      .post("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ songId })
      .expect(201);
    expect(res.body.data.recorded).toBe(true);
  });

  it("lists history", async () => {
    const res = await request(app)
      .get("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.history.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects history for unknown song", async () => {
    const res = await request(app)
      .post("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: 99999 })
      .expect(404);
    expect(res.body.error.code).toBe("SONG_NOT_FOUND");
  });
});

describe("Moods", () => {
  it("creates a mood", async () => {
    const res = await request(app)
      .post("/api/moods")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Late night driving vibes", songTitle: "Hukum" })
      .expect(201);
    expect(res.body.data.mood.text).toBe("Late night driving vibes");
    expect(res.body.data.mood.user_name).toBe("Jane");
  });

  it("lists moods", async () => {
    const res = await request(app).get("/api/moods").expect(200);
    expect(res.body.data.moods.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty mood text", async () => {
    const res = await request(app)
      .post("/api/moods")
      .send({ text: "" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });
});

describe("Error handling", () => {
  it("returns standard error shape for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist").expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("handles malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{invalid json")
      .expect(400);
  });
});