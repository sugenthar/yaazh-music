import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";

const { MOCK_RAW_SONGS } = vi.hoisted(() => {
  const mkTrack = (
    id: string,
    title: string,
    artist: string,
    album: string,
    duration: number
  ) => ({
    id,
    title,
    user: { name: artist },
    album_backlink: { playlist_name: album },
    artwork: {
      "150x150": `https://img.example.com/${id}-150.jpg`,
      "480x480": `https://img.example.com/${id}-480.jpg`,
      "1000x1000": `https://img.example.com/${id}-1000.jpg`,
    },
    duration: String(duration),
    release_date: "2023-05-12T00:00:00Z",
    is_streamable: true,
  });
  const MOCK_RAW_SONGS = [
    mkTrack("s1", "Hukum", "Anirudh Ravichander", "Jailer", 220),
    mkTrack("s2", "Badass - Leo", "Anirudh Ravichander", "Leo", 210),
    mkTrack("s3", "Mallipoo", "A.R. Rahman", "Jodi", 200),
  ];
  return { MOCK_RAW_SONGS: MOCK_RAW_SONGS as unknown[] };
});

vi.mock("../src/modules/music/providers/audius.provider", () => {
  const map = (raw: Record<string, unknown>) => {
    const r = raw as Record<string, any>;
    const id = String(r.id);
    return {
      id: `audius-${id}`,
      sourceId: id,
      title: String(r.title),
      artist: String(r.user?.name ?? ""),
      artists: r.user?.name ? [String(r.user.name)] : [],
      album: String(r.album_backlink?.playlist_name ?? ""),
      artworkUrl: String(r.artwork?.["1000x1000"] ?? ""),
      audioUrl: `https://mock-audius.example/v1/tracks/${id}/stream`,
      duration: Number(r.duration) || 0,
      language: "tamil",
      year: 2023,
      source: "audius",
    };
  };

  const matches = (raw: Record<string, any>, query: string) => {
    const q = query.toLowerCase();
    return (
      String(raw.title).toLowerCase().includes(q) ||
      String(raw.user?.name ?? "").toLowerCase().includes(q)
    );
  };

  return {
    audiusProvider: {
      search: vi.fn(async (query: string, page: number, limit: number) => {
        const all = (MOCK_RAW_SONGS as Record<string, any>[]).filter(
          (s) => !query || query.toLowerCase() === "tamil" || matches(s, query)
        );
        const start = (page - 1) * limit;
        const slice = all.slice(start, start + limit);
        return {
          songs: slice.map(map),
          hasNextPage: start + slice.length < all.length,
        };
      }),
      getById: vi.fn(async (songId: string) => {
        const raw = (MOCK_RAW_SONGS as Record<string, any>[]).find(
          (s) => `audius-${s.id}` === songId || s.id === songId
        );
        return raw ? map(raw) : null;
      }),
      health: vi.fn(async () => ({ status: "available", latencyMs: 10 })),
    },
  };
});

let app: Express;
let dbPath: string;
let token: string;

const SONG_1 = "audius-s1";

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `yaazh-test-${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  process.env.JWT_SECRET = "test-secret";
  process.env.NODE_ENV = "test";
  process.env.AUDIUS_API_BASE_URL = "https://mock-audius.example";

  const { createApp } = await import("../src/server");
  app = createApp();
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

describe("Music search API", () => {
  it("returns songs from the Audius provider", async () => {
    const res = await request(app).get("/api/music/search?q=hukum").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.songs.length).toBe(1);
    expect(res.body.data.songs[0].title).toBe("Hukum");
    expect(res.body.data.songs[0].source).toBe("audius");
    expect(res.body.data.songs[0].sourceId).toBe("s1");
  });

  it("returns canonical song fields", async () => {
    const res = await request(app).get("/api/music/search?q=hukum").expect(200);
    const song = res.body.data.songs[0];
    expect(song.id).toBe("audius-s1");
    expect(song.artworkUrl).toBe("https://img.example.com/s1-1000.jpg");
    expect(song.audioUrl).toBe("https://mock-audius.example/v1/tracks/s1/stream");
    expect(song.duration).toBe(220);
  });

  it("paginates search results", async () => {
    const res = await request(app)
      .get("/api/music/search?q=tamil&page=2&limit=2")
      .expect(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.songs.length).toBe(1);
    expect(res.body.data.pagination.page).toBe(2);
    expect(res.body.data.pagination.limit).toBe(2);
    expect(res.body.data.pagination.hasNextPage).toBe(false);
  });

  it("has next page when more results remain", async () => {
    const res = await request(app)
      .get("/api/music/search?q=tamil&page=1&limit=2")
      .expect(200);
    expect(res.body.data.pagination.hasNextPage).toBe(true);
  });

  it("defaults to page 1 and limit 20", async () => {
    const res = await request(app).get("/api/music/search?q=hukum").expect(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
  });

  it("rejects a missing query", async () => {
    const res = await request(app).get("/api/music/search").expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects a whitespace-only query", async () => {
    const res = await request(app).get("/api/music/search?q=%20%20%20").expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects a query longer than 100 characters", async () => {
    const res = await request(app)
      .get(`/api/music/search?q=${"a".repeat(101)}`)
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("clamps limit above 20", async () => {
    const res = await request(app)
      .get("/api/music/search?q=tamil&limit=999")
      .expect(200);
    expect(res.body.data.limit).toBe(20);
  });

  it("rejects an invalid page value", async () => {
    const res = await request(app)
      .get("/api/music/search?q=tamil&page=-1")
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns MUSIC_PROVIDER_UNAVAILABLE when the provider fails", async () => {
    const { audiusProvider } = await import(
      "../src/modules/music/providers/audius.provider"
    );
    (audiusProvider.search as unknown as {
      mockRejectedValueOnce: (value: unknown) => void;
    }).mockRejectedValueOnce(new Error("provider exploded"));
    const res = await request(app).get("/api/music/search?q=hukum").expect(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("MUSIC_PROVIDER_UNAVAILABLE");
    expect(res.body.error.message).toBe("Music service is temporarily unavailable.");
  });
});

describe("Music health API", () => {
  it("reports the provider status", async () => {
    const res = await request(app).get("/api/music/health").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider.name).toBe("audius");
    expect(res.body.data.provider.status).toBe("available");
  });

  it("reports unavailable when the provider is down", async () => {
    const { audiusProvider } = await import(
      "../src/modules/music/providers/audius.provider"
    );
    (audiusProvider.health as unknown as {
      mockRejectedValueOnce: (value: unknown) => void;
    }).mockRejectedValueOnce({ status: "unavailable", latencyMs: 5 });
    const res = await request(app).get("/api/music/health").expect(200);
    expect(res.body.data.provider.status).toBe("unavailable");
  });
});

describe("Music service limits", () => {
  it("clamps limit to a maximum of 20", async () => {
    const { enforceLimit, enforcePage, MAX_LIMIT, DEFAULT_LIMIT } = await import(
      "../src/modules/music/music.service"
    );
    expect(MAX_LIMIT).toBe(20);
    expect(DEFAULT_LIMIT).toBe(20);
    expect(enforceLimit(100)).toBe(20);
    expect(enforceLimit(20)).toBe(20);
    expect(enforceLimit(5)).toBe(5);
    expect(enforceLimit(0)).toBe(20);
    expect(enforceLimit(-3)).toBe(20);
    expect(enforcePage(2)).toBe(2);
    expect(enforcePage(0)).toBe(1);
    expect(enforcePage(-1)).toBe(1);
  });
});

describe("Songs API", () => {
  it("GET /api/songs returns a default feed", async () => {
    const res = await request(app).get("/api/songs").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.songs.length).toBe(3);
    expect(res.body.data.limit).toBe(20);
  });

  it("GET /api/songs/:id returns a song by source id", async () => {
    const res = await request(app).get("/api/songs/audius-s1").expect(200);
    expect(res.body.data.song.title).toBe("Hukum");
  });

  it("GET /api/songs/:id returns 404 for unknown songs", async () => {
    const res = await request(app).get("/api/songs/unknown-id").expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("SONG_NOT_FOUND");
  });
});

describe("Search API (legacy)", () => {
  it("GET /api/search?q=hukum returns matching songs", async () => {
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
    const res = await request(app).post(`/api/likes/${SONG_1}`).expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("likes a song", async () => {
    const res = await request(app)
      .post(`/api/likes/${SONG_1}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(res.body.data.liked).toBe(true);
  });

  it("does not duplicate a like", async () => {
    const res = await request(app)
      .post(`/api/likes/${SONG_1}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.liked).toBe(true);
  });

  it("returns library with liked song", async () => {
    const res = await request(app)
      .get("/api/library")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      res.body.data.likedSongs.some((s: { id: string }) => s.id === SONG_1)
    ).toBe(true);
  });

  it("returns 404 when liking a non-existent song", async () => {
    const res = await request(app)
      .post("/api/likes/does-not-exist")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
    expect(res.body.error.code).toBe("SONG_NOT_FOUND");
  });

  it("unlikes a song", async () => {
    const res = await request(app)
      .delete(`/api/likes/${SONG_1}`)
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
      .send({ songId: SONG_1 })
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
    expect(res.body.data.playlist.songs[0].id).toBe(SONG_1);
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
      .delete(`/api/playlists/${row.id}/songs/${SONG_1}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const res = await request(app)
      .get(`/api/playlists/${row.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.playlist.songCount).toBe(0);
  });

  it("cannot access another user's playlist (404)", async () => {
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
      .send({ songId: SONG_1 })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("records listening history", async () => {
    const res = await request(app)
      .post("/api/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ songId: SONG_1 })
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
      .send({ songId: "does-not-exist" })
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