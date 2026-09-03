import { describe, it, expect } from "vitest";
import { DemoProvider } from "../src/modules/music/providers/demo.provider";

const provider = new DemoProvider();

describe("DemoProvider", () => {
  describe("properties", () => {
    it("has name 'demo'", () => {
      expect(provider.name).toBe("demo");
    });

    it("has priority 3", () => {
      expect(provider.priority).toBe(3);
    });
  });

  describe("search", () => {
    it("returns all 10 songs for empty query", async () => {
      const result = await provider.search("", 1, 20);
      expect(result.songs).toHaveLength(10);
      expect(result.hasNextPage).toBe(false);
    });

    it("filters by title (case-insensitive)", async () => {
      const result = await provider.search("vaathi", 1, 20);
      expect(result.songs).toHaveLength(1);
      expect(result.songs[0].title).toBe("Vaathi Coming");
    });

    it("filters by artist (case-insensitive)", async () => {
      const result = await provider.search("sid sriram", 1, 20);
      expect(result.songs).toHaveLength(1);
      expect(result.songs[0].title).toBe("Ennodu Nee Irundhaal");
    });

    it("filters by album (case-insensitive)", async () => {
      const result = await provider.search("master", 1, 20);
      expect(result.songs).toHaveLength(1);
      expect(result.songs[0].album).toBe("Master");
    });

    it("filters by language (case-insensitive)", async () => {
      const result = await provider.search("hindi", 1, 20);
      expect(result.songs).toHaveLength(1);
      expect(result.songs[0].title).toBe("Chaiyya Chaiyya");
      expect(result.songs[0].language).toBe("Hindi");
    });

    it("returns multiple results for a broad query", async () => {
      const result = await provider.search("A.R. Rahman", 1, 20);
      expect(result.songs.length).toBeGreaterThanOrEqual(4);
    });

    it("paginates correctly", async () => {
      const page1 = await provider.search("", 1, 3);
      expect(page1.songs).toHaveLength(3);
      expect(page1.hasNextPage).toBe(true);

      const page2 = await provider.search("", 2, 3);
      expect(page2.songs).toHaveLength(3);
      expect(page2.hasNextPage).toBe(true);

      const page4 = await provider.search("", 4, 3);
      expect(page4.songs).toHaveLength(1);
      expect(page4.hasNextPage).toBe(false);
    });

    it("returns empty for non-matching query", async () => {
      const result = await provider.search("xyzxyzxyz", 1, 20);
      expect(result.songs).toHaveLength(0);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe("getById", () => {
    it("returns song by sourceId format (demo-1)", async () => {
      const song = await provider.getById("demo-1");
      expect(song).not.toBeNull();
      expect(song!.title).toBe("Vaathi Coming");
    });

    it("returns song by full id (demo-1)", async () => {
      const song = await provider.getById("demo-1");
      expect(song).not.toBeNull();
      expect(song!.sourceId).toBe("demo-1");
    });

    it("returns null for unknown id", async () => {
      const song = await provider.getById("demo-999");
      expect(song).toBeNull();
    });
  });

  describe("health", () => {
    it("returns available status with 0 latency", async () => {
      const health = await provider.health();
      expect(health.status).toBe("available");
      expect(health.latencyMs).toBe(0);
    });
  });

  describe("isAvailable", () => {
    it("always returns true", () => {
      expect(provider.isAvailable()).toBe(true);
    });
  });
});
