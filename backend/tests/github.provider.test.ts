import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  githubSongsUrl: "https://example.com/songs.json",
}));

vi.mock("../src/config/env", () => ({
  default: mockEnv,
}));

vi.mock("../src/utils/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

import { GitHubProvider } from "../src/modules/music/providers/github.provider";

const mockFetch = vi.fn();

const sampleSongs = [
  {
    id: "s1",
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    album: "Aashiqui 2",
    artworkUrl: "https://example.com/s1.jpg",
    audioUrl: "https://example.com/s1.mp3",
    duration: 240,
    year: 2013,
    language: "Hindi",
  },
  {
    id: "s2",
    title: "Nenjukkulle",
    artist: "A.R. Rahman",
    album: "Kadal",
    artworkUrl: "https://example.com/s2.jpg",
    audioUrl: "https://example.com/s2.mp3",
    duration: 300,
    year: 2013,
    language: "Tamil",
  },
  {
    id: "s3",
    title: "Chaiyya Chaiyya",
    artist: "Sukhwinder Singh",
    album: "Dil Se",
    duration: 360,
    year: 1998,
    language: "Hindi",
  },
  {
    id: "s4",
    title: "Kal Ho Naa Ho",
    artist: "Sonu Nigam",
    album: "Kal Ho Naa Ho",
    duration: 320,
    year: 2003,
  },
  {
    id: "s5",
    title: "Roja Kaadhal Rojave",
    artist: "S.P. Balasubrahmanyam",
    album: "Roja",
    duration: 280,
    year: 1992,
  },
];

const okJson = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const errorResponse = (status: number) => ({
  ok: false,
  status,
  json: async () => ({}),
});

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  mockEnv.githubSongsUrl = "https://example.com/songs.json";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const makeProvider = () => new GitHubProvider();

describe("GitHubProvider.search", () => {
  it("returns matching songs from fetched data", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("Tum", 1, 20);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].title).toBe("Tum Hi Ho");
    expect(result.songs[0].id).toBe("github-s1");
    expect(result.songs[0].source).toBe("github");
  });

  it("filters by title case-insensitive", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("tum", 1, 20);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].title).toBe("Tum Hi Ho");
  });

  it("filters by artist", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("arijit", 1, 20);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].artist).toBe("Arijit Singh");
  });

  it("filters by album", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("aashiqui", 1, 20);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].album).toBe("Aashiqui 2");
  });

  it("paginates correctly", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const page1 = await provider.search("", 1, 2);
    expect(page1.songs).toHaveLength(2);
    expect(page1.hasNextPage).toBe(true);

    const page2 = await provider.search("", 2, 2);
    expect(page2.songs).toHaveLength(2);
    expect(page2.hasNextPage).toBe(true);

    const page3 = await provider.search("", 3, 2);
    expect(page3.songs).toHaveLength(1);
    expect(page3.hasNextPage).toBe(false);
  });

  it("returns empty results for non-matching query", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("zzznothere", 1, 20);
    expect(result.songs).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });

  it("empty query returns all songs", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(5);
  });
});

describe("GitHubProvider.getById", () => {
  it("returns song by sourceId", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const song = await provider.getById("s2");
    expect(song).not.toBeNull();
    expect(song?.id).toBe("github-s2");
    expect(song?.title).toBe("Nenjukkulle");
  });

  it("returns song by id with github- prefix", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const song = await provider.getById("github-s1");
    expect(song).not.toBeNull();
    expect(song?.title).toBe("Tum Hi Ho");
  });

  it("returns null for unknown song", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const song = await provider.getById("nonexistent");
    expect(song).toBeNull();
  });
});

describe("GitHubProvider.health", () => {
  it("reports available when songs loaded", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const health = await provider.health();
    expect(health.status).toBe("available");
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("reports unavailable when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    const provider = makeProvider();
    const health = await provider.health();
    expect(health.status).toBe("unavailable");
  });

  it("reports unavailable when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500));
    const provider = makeProvider();
    const health = await provider.health();
    expect(health.status).toBe("unavailable");
  });

  it("reports unavailable when empty array returned", async () => {
    mockFetch.mockResolvedValueOnce(okJson([]));
    const provider = makeProvider();
    const health = await provider.health();
    expect(health.status).toBe("unavailable");
  });
});

describe("GitHubProvider.isAvailable", () => {
  it("returns true when URL is set and songs loaded", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    await provider.search("", 1, 20);
    expect(provider.isAvailable()).toBe(true);
  });

  it("returns false when URL is empty", async () => {
    mockEnv.githubSongsUrl = "";
    const provider = makeProvider();
    await provider.search("", 1, 20);
    expect(provider.isAvailable()).toBe(false);
  });

  it("returns false when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fail"));
    const provider = makeProvider();
    await provider.search("", 1, 20);
    expect(provider.isAvailable()).toBe(false);
  });
});

describe("GitHubProvider response format normalization", () => {
  it("normalizes direct array format", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(5);
  });

  it("normalizes { songs: [...] } format", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ songs: sampleSongs }));
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(5);
  });

  it("normalizes { tracks: [...] } format", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ tracks: sampleSongs }));
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(5);
  });

  it("handles unknown object format gracefully", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: "something else" }));
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(0);
  });

  it("filters out malformed entries with no id or title", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson([
        { id: "ok", title: "Good" },
        { id: "also-ok", title: "Also Good" },
        { id: "" },
        { title: "" },
        {},
      ])
    );
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(2);
    expect(result.songs[0].title).toBe("Good");
    expect(result.songs[1].title).toBe("Also Good");
  });

  it("normalizes nested user.name as artist fallback", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson([{ id: "u1", title: "Test", user: { name: "Fallback Artist" } }])
    );
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs[0].artist).toBe("Fallback Artist");
  });

  it("defaults artist to Unknown Artist when missing", async () => {
    mockFetch.mockResolvedValueOnce(okJson([{ id: "a1", title: "No Artist" }]));
    const provider = makeProvider();
    const result = await provider.search("", 1, 20);
    expect(result.songs[0].artist).toBe("Unknown Artist");
  });
});

describe("GitHubProvider error handling", () => {
  it("handles fetch errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const provider = makeProvider();
    const result = await provider.search("test", 1, 20);
    expect(result.songs).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });

  it("handles non-Error thrown values", async () => {
    mockFetch.mockRejectedValueOnce("string error");
    const provider = makeProvider();
    const result = await provider.search("test", 1, 20);
    expect(result.songs).toHaveLength(0);
  });
});

describe("GitHubProvider caching", () => {
  it("caches songs and does not re-fetch within interval", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    await provider.search("Tum", 1, 20);
    await provider.search("Rahman", 1, 20);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns cached data from second call", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    await provider.search("", 1, 20);
    await provider.search("", 1, 20);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after reset", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    await provider.search("Tum", 1, 20);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    provider.reset();

    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    await provider.search("Tum", 1, 20);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns empty when URL is not configured", async () => {
    mockEnv.githubSongsUrl = "";
    const provider = makeProvider();
    const result = await provider.search("test", 1, 20);
    expect(result.songs).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("GitHubProvider.reset", () => {
  it("clears cache and allows re-fetch", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleSongs));
    const provider = makeProvider();
    await provider.search("", 1, 20);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    provider.reset();

    mockFetch.mockResolvedValueOnce(okJson([sampleSongs[0]]));
    const result = await provider.search("", 1, 20);
    expect(result.songs).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("resets availability to true", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fail"));
    const provider = makeProvider();
    await provider.search("", 1, 20);
    expect(provider.isAvailable()).toBe(false);

    provider.reset();
    expect(provider.isAvailable()).toBe(true);
  });
});

describe("GitHubProvider properties", () => {
  it("has correct name and priority", () => {
    const provider = makeProvider();
    expect(provider.name).toBe("github");
    expect(provider.priority).toBe(2);
  });
});
