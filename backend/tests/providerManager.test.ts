import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MusicProvider, ProviderSearchResult } from "../src/modules/music/providers/music-provider.interface";
import type { YaazhSong } from "../src/modules/music/music.types";

vi.mock("../src/config/env", () => ({
  default: {
    providerFailureThreshold: 2,
    providerCooldownMs: 60_000,
    nodeEnv: "test",
  },
}));

const { ProviderManager } = await import("../src/modules/music/providerManager");

function createMockProvider(
  name: string,
  priority: number,
  searchResult?: ProviderSearchResult,
  shouldFail = false
): MusicProvider & {
  search: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  health: ReturnType<typeof vi.fn>;
  isAvailable: ReturnType<typeof vi.fn>;
} {
  return {
    name,
    priority,
    isAvailable: vi.fn(() => true),
    search: vi.fn(async () => {
      if (shouldFail) throw new Error(`${name} failed`);
      return searchResult || { songs: [], hasNextPage: false };
    }),
    getById: vi.fn(async () => null),
    health: vi.fn(async () => ({ status: "available" as const, latencyMs: 0 })),
  };
}

function makeSong(id: string, title: string): YaazhSong {
  return {
    id,
    title,
    artist: "Test Artist",
    album: "Test Album",
    artworkUrl: null,
    audioUrl: null,
    duration: 180,
    source: "test",
    sourceId: id,
  };
}

describe("ProviderManager", () => {
  let manager: InstanceType<typeof ProviderManager>;

  beforeEach(() => {
    manager = new ProviderManager();
  });

  it("register adds provider and sorts by priority", async () => {
    const low = createMockProvider("low", 30);
    const high = createMockProvider("high", 10);
    const mid = createMockProvider("mid", 20);

    manager.register(low);
    manager.register(high);
    manager.register(mid);

    const statuses = await manager.health();
    expect(statuses.map((s) => s.name)).toEqual(["high", "mid", "low"]);
    expect(statuses.map((s) => s.priority)).toEqual([10, 20, 30]);
  });

  it("getProvider returns correct provider", () => {
    const p = createMockProvider("alpha", 1);
    manager.register(p);
    expect(manager.getProvider("alpha")).toBe(p);
    expect(manager.getProvider("nonexistent")).toBeUndefined();
  });

  it("search tries providers in priority order", async () => {
    const first = createMockProvider("first", 1);
    const second = createMockProvider("second", 2);

    manager.register(second);
    manager.register(first);

    await manager.search("test", 1, 10);

    expect(first.search).toHaveBeenCalledOnce();
    expect(second.search).not.toHaveBeenCalled();
  });

  it("search returns first successful result", async () => {
    const song = makeSong("1", "Song One");
    const first = createMockProvider("first", 1, { songs: [song], hasNextPage: true });
    manager.register(first);

    const result = await manager.search("test", 1, 10);

    expect(result.songs).toEqual([song]);
    expect(result.hasNextPage).toBe(true);
    expect(result.query).toBe("test");
  });

  it("search falls back to next provider on failure", async () => {
    const song = makeSong("2", "Song Two");
    const first = createMockProvider("first", 1, undefined, true);
    const second = createMockProvider("second", 2, { songs: [song], hasNextPage: false });

    manager.register(first);
    manager.register(second);

    const result = await manager.search("test", 1, 10);

    expect(first.search).toHaveBeenCalledOnce();
    expect(second.search).toHaveBeenCalledOnce();
    expect(result.songs).toEqual([song]);
  });

  it("search falls back to all providers when first fails", async () => {
    const first = createMockProvider("first", 1, undefined, true);
    const second = createMockProvider("second", 2, undefined, true);
    const third = createMockProvider("third", 3, { songs: [makeSong("3", "S")], hasNextPage: false });

    manager.register(first);
    manager.register(second);
    manager.register(third);

    const result = await manager.search("test", 1, 10);

    expect(first.search).toHaveBeenCalledOnce();
    expect(second.search).toHaveBeenCalledOnce();
    expect(third.search).toHaveBeenCalledOnce();
    expect(result.songs).toHaveLength(1);
  });

  it("search returns empty if all providers fail", async () => {
    const first = createMockProvider("first", 1, undefined, true);
    const second = createMockProvider("second", 2, undefined, true);

    manager.register(first);
    manager.register(second);

    const result = await manager.search("test", 1, 10);

    expect(result.songs).toEqual([]);
    expect(result.hasNextPage).toBe(false);
    expect(result.query).toBe("test");
  });

  it("search records circuit breaker failures", async () => {
    const p = createMockProvider("failing", 1, undefined, true);
    manager.register(p);

    await manager.search("test", 1, 10);

    const statuses = await manager.health();
    const stats = statuses[0].stats;
    expect(stats.failures).toBeGreaterThanOrEqual(1);
    expect(stats.consecutiveFailures).toBeGreaterThanOrEqual(1);
  });

  it("search records circuit breaker successes", async () => {
    const p = createMockProvider("ok", 1, { songs: [], hasNextPage: false });
    manager.register(p);

    await manager.search("test", 1, 10);

    const statuses = await manager.health();
    expect(statuses[0].stats.successes).toBe(1);
    expect(statuses[0].stats.consecutiveFailures).toBe(0);
  });

  it("getById tries providers in priority order", async () => {
    const song = makeSong("s1", "Found");
    const first = createMockProvider("first", 1);
    first.getById.mockResolvedValue(song);
    const second = createMockProvider("second", 2);

    manager.register(second);
    manager.register(first);

    const result = await manager.getById("s1");

    expect(first.getById).toHaveBeenCalledOnce();
    expect(second.getById).not.toHaveBeenCalled();
    expect(result).toEqual(song);
  });

  it("getById returns first found song", async () => {
    const song = makeSong("s1", "Found");
    const p = createMockProvider("p", 1);
    p.getById.mockResolvedValue(song);
    manager.register(p);

    const result = await manager.getById("s1");
    expect(result).toEqual(song);
  });

  it("getById tries all providers if first returns null", async () => {
    const song = makeSong("s2", "Second");
    const first = createMockProvider("first", 1);
    first.getById.mockResolvedValue(null);
    const second = createMockProvider("second", 2);
    second.getById.mockResolvedValue(song);

    manager.register(first);
    manager.register(second);

    const result = await manager.getById("s2");

    expect(first.getById).toHaveBeenCalledOnce();
    expect(second.getById).toHaveBeenCalledOnce();
    expect(result).toEqual(song);
  });

  it("health returns status for all providers", async () => {
    const a = createMockProvider("a", 1);
    const b = createMockProvider("b", 2);
    manager.register(a);
    manager.register(b);

    const statuses = await manager.health();

    expect(statuses).toHaveLength(2);
    expect(statuses.map((s) => s.name).sort()).toEqual(["a", "b"]);
    for (const s of statuses) {
      expect(s).toHaveProperty("circuitState");
      expect(s).toHaveProperty("isAvailable");
      expect(s).toHaveProperty("stats");
    }
  });

  it("reset resets all circuit breakers", async () => {
    const p = createMockProvider("p", 1, undefined, true);
    manager.register(p);

    await manager.search("test", 1, 10);
    await manager.search("test", 1, 10);
    expect((await manager.health())[0].circuitState).toBe("open");

    manager.reset();
    expect((await manager.health())[0].circuitState).toBe("closed");
  });

  it("provider with lower priority number is tried first", async () => {
    const song = makeSong("low", "Low Priority Num");
    const highPri = createMockProvider("highPri", 10);
    highPri.search.mockResolvedValue({ songs: [], hasNextPage: false });
    const lowPri = createMockProvider("lowPri", 5, { songs: [song], hasNextPage: false });

    manager.register(highPri);
    manager.register(lowPri);

    const result = await manager.search("test", 1, 10);

    expect(lowPri.search).toHaveBeenCalledOnce();
    expect(highPri.search).not.toHaveBeenCalled();
    expect(result.songs).toEqual([song]);
  });

  it("unavailable provider (isAvailable=false) is skipped", async () => {
    const unavailable = createMockProvider("unavail", 1);
    unavailable.isAvailable.mockReturnValue(false);
    const available = createMockProvider("avail", 2, { songs: [makeSong("a", "A")], hasNextPage: false });

    manager.register(unavailable);
    manager.register(available);

    const result = await manager.search("test", 1, 10);

    expect(unavailable.search).not.toHaveBeenCalled();
    expect(available.search).toHaveBeenCalledOnce();
    expect(result.songs).toHaveLength(1);
  });
});
