import { beforeAll, afterAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

let dbPath: string;
let userId: number;
let likes: any;
let playlists: any;
let history: any;
let userRepository: any;
let banners: any;

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `yaazh-repo-${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  process.env.NODE_ENV = "test";

  const repo = await import("../src/repositories");
  userRepository = repo.userRepository;
  likes = repo.likes;
  playlists = repo.playlists;
  history = repo.history;
  banners = repo.banners;
});

afterAll(async () => {
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

describe("repository layer", () => {
  describe("userRepository", () => {
    it("creates and finds a user by email and id", () => {
      const user = userRepository.create({
        name: "Tester",
        email: "Repo@Example.com",
        passwordHash: "hash",
      });
      userId = user.id;
      expect(user.name).toBe("Tester");

      expect(userRepository.findByEmail("repo@example.com")!.id).toBe(userId);
      expect(userRepository.findByEmail("REPO@EXAMPLE.COM")!.id).toBe(userId);
      expect(userRepository.findById(userId)!.email).toBe("repo@example.com");
    });
  });

  describe("likeRepository", () => {
    it("adds a like idempotently (no duplicate rows)", () => {
      const first = likes.add(userId, "song-1", null);
      const second = likes.add(userId, "song-1", null);
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(likes.list(userId)).toHaveLength(1);
      expect(likes.isLiked(userId, "song-1")).toBe(true);
      expect(likes.listSongIds(userId)).toEqual(["song-1"]);
    });

    it("removes a like", () => {
      likes.remove(userId, "song-1");
      expect(likes.isLiked(userId, "song-1")).toBe(false);
      expect(likes.list(userId)).toHaveLength(0);
    });
  });

  describe("playlistRepository", () => {
    it("creates a playlist for a user", () => {
      const playlist = playlists.create(userId, "Driving", "Rock");
      expect(playlist.name).toBe("Driving");
      expect(playlist.user_id).toBe(userId);
      expect(playlists.findOwned(userId, playlist.id)).not.toBeNull();
      expect(playlists.findOwned(userId + 999, playlist.id)).toBeNull();
    });

    it("adds songs without duplication", () => {
      const pl = playlists.create(userId, "Mix", null);
      playlists.addSong(pl.id, "sA", null);
      const dup = playlists.addSong(pl.id, "sA", null);
      expect(dup.created).toBe(false);
      expect(playlists.songsFor(pl.id)).toHaveLength(1);
      playlists.removeSong(pl.id, "sA");
      expect(playlists.songsFor(pl.id)).toHaveLength(0);
    });

    it("deletes a playlist and its songs", () => {
      const pl = playlists.create(userId, "Temp", null);
      playlists.addSong(pl.id, "sB", null);
      playlists.delete(pl.id);
      expect(playlists.findById(pl.id)).toBeNull();
    });

    it("rejects adding to another user's playlist", () => {
      const owner = userRepository.create({ name: "Other", email: "other@o.com", passwordHash: "h" });
      const pl = playlists.create(owner.id, "Private", null);
      expect(playlists.findOwned(userId, pl.id)).toBeNull();
    });
  });

  describe("historyRepository", () => {
    it("records and lists history", () => {
      history.add(userId, "h1", null);
      history.add(userId, "h2", null);
      const entries = history.list(userId, 10);
      expect(entries.map((e: { song_id: string }) => e.song_id)).toEqual(["h2", "h1"]);
    });

    it("clears history", () => {
      history.add(userId, "h3", null);
      const deleted = history.clear(userId);
      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(history.list(userId, 10)).toHaveLength(0);
    });
  });

  describe("bannerRepository", () => {
    it("seeds a featured banner on registration", () => {
      const featured = banners.listByType("featured");
      expect(featured.length).toBeGreaterThanOrEqual(1);
      expect(featured[0].imageKey).toBe("yaazh_music_banner");
      expect(featured[0].action.type).toBe("screen");
      expect(featured[0].action.target).toBe("search");
    });

    it("seeds inline banners and lists them by type", () => {
      banners.seed({
        type: "inline",
        title: "Test inline",
        imageKey: "test_inline",
      });
      const inline = banners.listByType("inline");
      expect(inline.some((b: { imageKey: string }) => b.imageKey === "test_inline")).toBe(true);
    });

    it("does not duplicate seeds with the same image key", () => {
      const before = banners.count();
      banners.seed({
        type: "featured",
        title: "Welcome to Yaazh Music",
        imageKey: "yaazh_music_banner",
      });
      expect(banners.count()).toBe(before);
    });
  });

  describe("concurrency", () => {
    it("handles many simultaneous likes without duplicates", async () => {
      const taskCount = 50;
      await Promise.all(
        Array.from({ length: taskCount }, (_, i) =>
          Promise.resolve().then(() => likes.add(userId, `conc-${i % 10}`, null))
        )
      );
      expect(likes.list(userId)).toHaveLength(10);
    });
  });
});
