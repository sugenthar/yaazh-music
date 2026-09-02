import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AudiusProvider, ProviderError } from "../src/modules/music/providers/audius.provider";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
});

const rawTrack = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Song ${id}`,
  user: { name: `Artist ${id}` },
  artwork: {
    "150x150": `https://art.example/${id}/150x150.jpg`,
    "480x480": `https://art.example/${id}/480x480.jpg`,
    "1000x1000": `https://art.example/${id}/1000x1000.jpg`,
  },
  duration: 180,
  release_date: "2023-05-12T00:00:00Z",
  mood: "Romantic",
  is_streamable: true,
  access: { stream: true, download: false },
  ...overrides,
});

const okJson = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const errorResponse = (status: number) => ({
  ok: false,
  status,
  json: async () => ({ error: { message: "boom" } }),
});

const makeProvider = () =>
  new AudiusProvider("https://mock-audius.example", {
    timeoutMs: 50,
    maxRetries: 2,
  });

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("AudiusProvider.search", () => {
  it("maps provider tracks into YaazhSong fields", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: [rawTrack("t1")] }));
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("tum hi ho", 1, 20);
    expect(result.songs).toHaveLength(1);
    const song = result.songs[0];
    expect(song.id).toBe("audius-t1");
    expect(song.source).toBe("audius");
    expect(song.sourceId).toBe("t1");
    expect(song.title).toBe("Song t1");
    expect(song.artist).toBe("Artist t1");
    expect(song.artworkUrl).toBe("https://art.example/t1/1000x1000.jpg");
    expect(song.audioUrl).toBe("https://mock-audius.example/v1/tracks/t1/stream");
    expect(song.duration).toBe(180);
    expect(song.year).toBe(2023);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/tracks/search"),
      expect.anything()
    );
  });

  it("falls back to smaller artwork sizes and accepts plain string artwork", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        data: [
          rawTrack("a", {
            artwork: {
              "150x150": "https://art.example/a/150x150.jpg",
              "480x480": "https://art.example/a/480x480.jpg",
            },
          }),
          rawTrack("b", { artwork: "https://art.example/b/cover.jpg" }),
          rawTrack("c", { artwork: null }),
        ],
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("query", 1, 20);
    expect(result.songs[0].artworkUrl).toBe("https://art.example/a/480x480.jpg");
    expect(result.songs[1].artworkUrl).toBe("https://art.example/b/cover.jpg");
    expect(result.songs[2].artworkUrl).toBeNull();
  });

  it("requests an offset window for later pages", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: [rawTrack("t1")] }));
    vi.stubGlobal("fetch", mockFetch);

    await makeProvider().search("query", 2, 10);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/tracks/search"),
      expect.anything()
    );
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=10");
    expect(url).toContain("app_name=yaazh-music");
  });

  it("returns empty results and no next page for an empty payload", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("xyz", 1, 20);
    expect(result.songs).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });

  it("reports a next page when a full page is returned", async () => {
    const tracks = Array.from({ length: 20 }, (_, i) => rawTrack(String(i)));
    mockFetch.mockResolvedValueOnce(okJson({ data: tracks }));
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("tamil", 1, 20);
    expect(result.songs).toHaveLength(20);
    expect(result.hasNextPage).toBe(true);
  });

  it("filters malformed entries instead of crashing", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ data: [null, {}, { id: "", title: "NoId" }, { id: "ok", title: "Good" }] })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("tamil", 1, 20);
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0].title).toBe("Good");
  });

  it("deduplicates repeated track ids", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: [rawTrack("t1"), rawTrack("t1")] }));
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("hukum", 1, 20);
    expect(result.songs).toHaveLength(1);
  });

  it("returns a null audioUrl when the track is not streamable", async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({ data: [rawTrack("t2", { is_streamable: false, access: { stream: false } })] })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await makeProvider().search("hukum", 1, 20);
    expect(result.songs[0].audioUrl).toBeNull();
  });

  it("does not retry a 404 and reports it as non-retryable", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(404));
    vi.stubGlobal("fetch", mockFetch);

    await expect(makeProvider().search("hukum", 1, 20)).rejects.toMatchObject({
      status: 404,
      retryable: false,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries then fails on 429", async () => {
    mockFetch.mockResolvedValue(errorResponse(429));
    vi.stubGlobal("fetch", mockFetch);

    await expect(makeProvider().search("hukum", 1, 20)).rejects.toMatchObject({
      status: 429,
      retryable: true,
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries then fails on 500", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));
    vi.stubGlobal("fetch", mockFetch);

    await expect(makeProvider().search("hukum", 1, 20)).rejects.toMatchObject({
      status: 500,
      retryable: true,
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("times out and aborts the request", async () => {
    mockFetch.mockImplementation(
      (_url: unknown, opts: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          const rejectAbort = () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          if (opts?.signal) {
            if (opts.signal.aborted) rejectAbort();
            else opts.signal.addEventListener("abort", rejectAbort);
          }
        })
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(makeProvider().search("hukum", 1, 20)).rejects.toBeInstanceOf(
      ProviderError
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("treats malformed JSON as a provider failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(makeProvider().search("hukum", 1, 20)).rejects.toBeInstanceOf(
      ProviderError
    );
  });
});

describe("AudiusProvider.getById", () => {
  it("maps a single track response", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: rawTrack("single") }));
    vi.stubGlobal("fetch", mockFetch);

    const song = await makeProvider().getById("audius-single");
    expect(song).not.toBeNull();
    expect(song?.id).toBe("audius-single");
    expect(song?.audioUrl).toBe("https://mock-audius.example/v1/tracks/single/stream");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/tracks/single"),
      expect.anything()
    );
  });

  it("returns null for a 404 so the service can map it to SONG_NOT_FOUND", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(404));
    vi.stubGlobal("fetch", mockFetch);

    await expect(makeProvider().getById("audius-missing")).resolves.toBeNull();
  });
});

describe("AudiusProvider.health", () => {
  it("reports available when the provider answers", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ data: [] }));
    vi.stubGlobal("fetch", mockFetch);

    const health = await makeProvider().health();
    expect(health.status).toBe("available");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable when the provider is down without retrying", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));
    vi.stubGlobal("fetch", mockFetch);

    const health = await makeProvider().health();
    expect(health.status).toBe("unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});