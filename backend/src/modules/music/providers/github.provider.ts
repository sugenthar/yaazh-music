import env from "../../../config/env";
import { logger } from "../../../utils/logger";
import { YaazhSong } from "../music.types";
import { MusicProvider, ProviderSearchResult, ProviderHealth } from "./music-provider.interface";

const TIMEOUT_MS = 10_000;
const CACHE_KEY_PREFIX = "github";

const asString = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);

const normalizeSong = (raw: Record<string, unknown>): YaazhSong | null => {
  const id = asString(raw.id || raw.sourceId || raw.title).trim();
  const title = asString(raw.title).trim();
  if (!id || !title) return null;

  const user = raw.user && typeof raw.user === "object" ? (raw.user as Record<string, unknown>) : {};

  return {
    id: `github-${id}`,
    sourceId: id,
    source: "github",
    title,
    artist: asString(raw.artist || user.name).trim() || "Unknown Artist",
    artists: Array.isArray(raw.artists)
      ? raw.artists.map(asString)
      : raw.artist
        ? [asString(raw.artist)]
        : [],
    album: asString(raw.album || raw.albumName).trim(),
    artworkUrl: asString(raw.artworkUrl || raw.artwork || raw.coverUrl).trim() || null,
    audioUrl: asString(raw.audioUrl || raw.url || raw.streamUrl).trim() || null,
    duration: Number(raw.duration) || 0,
    language: raw.language ? asString(raw.language) : undefined,
    year: raw.year ? Number(raw.year) : undefined,
  };
};

export class GitHubProvider implements MusicProvider {
  readonly name = "github";
  readonly priority = 2;
  private songs: YaazhSong[] | null = null;
  private lastFetch = 0;
  private readonly fetchIntervalMs = 5 * 60 * 1000;
  private available = true;
  private fetchPromise: Promise<YaazhSong[]> | null = null;

  private getSongsUrl(): string {
    return env.githubSongsUrl;
  }

  private async fetchSongs(): Promise<YaazhSong[]> {
    const url = this.getSongsUrl();
    if (!url) return [];

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "yaazh-music-backend" },
      });
      clearTimeout(timer);

      if (!response.ok) {
        logger.warn("github.fetch.failed", { status: response.status });
        this.available = false;
        return [];
      }

      const data = await response.json();
      const items: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.songs)
          ? data.songs
          : Array.isArray(data?.tracks)
            ? data.tracks
            : [];

      const songs = items.map(normalizeSong).filter((s): s is YaazhSong => s !== null);
      this.lastFetch = Date.now();
      this.available = songs.length > 0;
      return songs;
    } catch (err) {
      logger.error("github.fetch.error", {
        error: err instanceof Error ? err.message : "unknown",
      });
      this.available = false;
      return [];
    }
  }

  private async ensureLoaded(): Promise<YaazhSong[]> {
    const now = Date.now();
    if (this.songs && now - this.lastFetch < this.fetchIntervalMs) {
      return this.songs;
    }
    if (this.fetchPromise) {
      return this.fetchPromise;
    }
    this.fetchPromise = this.fetchSongs().finally(() => {
      this.fetchPromise = null;
    });
    const songs = await this.fetchPromise;
    if (songs.length > 0) {
      this.songs = songs;
    }
    return songs;
  }

  async search(query: string, page: number, limit: number): Promise<ProviderSearchResult> {
    const all = await this.ensureLoaded();
    const q = query.toLowerCase().trim();
    const filtered = q
      ? all.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            (s.album && s.album.toLowerCase().includes(q))
        )
      : all;

    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);

    return {
      songs: slice,
      hasNextPage: start + slice.length < filtered.length,
    };
  }

  async getById(songId: string): Promise<YaazhSong | null> {
    const all = await this.ensureLoaded();
    const id = songId.replace(/^github-/, "");
    return all.find((s) => s.sourceId === id || s.id === songId) || null;
  }

  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const songs = await this.ensureLoaded();
      return {
        status: songs.length > 0 ? "available" : "unavailable",
        latencyMs: Date.now() - started,
      };
    } catch {
      return { status: "unavailable", latencyMs: Date.now() - started };
    }
  }

  isAvailable(): boolean {
    return this.available && this.getSongsUrl().length > 0;
  }

  reset(): void {
    this.songs = null;
    this.lastFetch = 0;
    this.available = true;
    this.fetchPromise = null;
  }
}
