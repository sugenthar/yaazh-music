import env from "../../../config/env";
import { logger } from "../../../utils/logger";
import { YaazhSong } from "../music.types";
import { MusicProvider, ProviderSearchResult, ProviderHealth } from "./music-provider.interface";

export interface ProviderSearchResultCompat {
  songs: YaazhSong[];
  hasNextPage: boolean;
}

export interface ProviderHealthCompat {
  status: "available" | "unavailable";
  latencyMs: number;
}

export class ProviderError extends Error {
  status?: number;
  retryable: boolean;

  constructor(message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "ProviderError";
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

type JsonRecord = Record<string, unknown>;

interface ProviderOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const BACKOFF_MS = 250;
const MAX_LIMIT_PER_REQUEST = 100;
const APP_NAME = "yaazh-music";
const UNKNOWN_ARTIST = "Unknown Artist";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isJsonRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const asString = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const resolveArtwork = (artwork: unknown): string | null => {
  if (typeof artwork === "string") {
    return artwork.length > 0 && isHttpUrl(artwork) ? artwork : null;
  }
  if (!isJsonRecord(artwork)) return null;
  for (const key of ["1000x1000", "480x480", "150x150"]) {
    const url = asString(artwork[key]);
    if (isHttpUrl(url)) return url;
  }
  for (const key of Object.keys(artwork)) {
    if (key === "mirrors") continue;
    const url = asString(artwork[key]);
    if (isHttpUrl(url)) return url;
  }
  return null;
};

const keyFor = (song: YaazhSong): string => {
  if (song.sourceId) return `${song.source}|${song.sourceId}`;
  const title = song.title.trim().toLowerCase();
  const artist = song.artist.trim().toLowerCase();
  return `${title}|${artist}`;
};

const dedupeSongs = (songs: YaazhSong[]): YaazhSong[] => {
  const seen = new Set<string>();
  const unique: YaazhSong[] = [];
  songs.forEach((song) => {
    const key = keyFor(song);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(song);
  });
  return unique;
};

export { ProviderSearchResult, ProviderHealth };

export class AudiusProvider implements MusicProvider {
  readonly name = "audius";
  readonly priority = 1;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private available = true;

  constructor(baseUrl: string = env.audiusApiBaseUrl, options: ProviderOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async search(query: string, page: number, limit: number): Promise<ProviderSearchResult> {
    const startedAt = Date.now();
    const effectivePage = Math.max(1, Math.floor(page));
    const effectiveLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT_PER_REQUEST);
    const offset = (effectivePage - 1) * effectiveLimit;

    const data = await this.request("/v1/tracks/search", {
      query,
      limit: effectiveLimit,
      offset,
    });
    const rawTracks = this.readResults(data ?? {});
    const mapped = (Array.isArray(rawTracks) ? rawTracks : [])
      .map((raw) => this.mapTrack(raw))
      .filter((song): song is YaazhSong => song !== null && song.title.trim().length > 0);

    const songs = dedupeSongs(mapped);
    this.available = true;
    logger.info("provider.search", {
      provider: "audius",
      query,
      page: effectivePage,
      limit: effectiveLimit,
      offset,
      durationMs: Date.now() - startedAt,
      results: songs.length,
    });
    return {
      songs,
      hasNextPage: songs.length >= effectiveLimit,
    };
  }

  async getById(songId: string): Promise<YaazhSong | null> {
    const id = songId.replace(/^audius-/, "");
    if (!id) return null;
    const data = await this.request(`/v1/tracks/${encodeURIComponent(id)}`, {}, { notFoundIsNull: true });
    const raw = data == null ? null : this.readResult(data);
    return raw ? this.mapTrack(raw) : null;
  }

  streamUrl(trackId: string): string {
    const id = trackId.replace(/^audius-/, "");
    return `${this.baseUrl}/v1/tracks/${encodeURIComponent(id)}/stream`;
  }

  async health(): Promise<ProviderHealth> {
    const startedAt = Date.now();
    try {
      await this.request("/v1/tracks/search", { query: "test", limit: 1, offset: 0 }, { retries: 0 });
      this.available = true;
      return { status: "available", latencyMs: Date.now() - startedAt };
    } catch (err) {
      this.available = false;
      logger.error("provider.health", {
        provider: "audius",
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : "unknown",
      });
      return { status: "unavailable", latencyMs: Date.now() - startedAt };
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  reset(): void {
    this.available = true;
  }

  private mapTrack(raw: unknown): YaazhSong | null {
    if (!isJsonRecord(raw)) return null;

    const sourceId = asString(raw.id).trim();
    const title = asString(raw.title).trim();
    if (!sourceId || !title) return null;

    const user = isJsonRecord(raw.user) ? raw.user : {};
    const artist = asString(user.name).trim() || UNKNOWN_ARTIST;

    const albumBacklink = isJsonRecord(raw.album_backlink) ? raw.album_backlink : null;
    const album = albumBacklink ? asString(albumBacklink.playlist_name).trim() : "";

    const duration = Number(raw.duration);
    const streamAccess = isJsonRecord(raw.access) ? raw.access : null;
    const streamable = raw.is_streamable !== false && streamAccess?.stream !== false;

    let year: number | undefined;
    const releaseDate = asString(raw.release_date);
    if (/^\d{4}/.test(releaseDate)) {
      const parsedYear = Number(releaseDate.slice(0, 4));
      if (Number.isFinite(parsedYear)) year = parsedYear;
    }

    return {
      id: `audius-${sourceId}`,
      sourceId,
      source: "audius",
      title,
      artist,
      artists: artist === UNKNOWN_ARTIST ? [] : [artist],
      album,
      artworkUrl: resolveArtwork(raw.artwork),
      audioUrl: streamable ? this.streamUrl(sourceId) : null,
      duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
      language: asString(raw.mood) || undefined,
      year,
    };
  }

  private async request(
    path: string,
    params: Record<string, string | number>,
    options: { retries?: number; notFoundIsNull?: boolean } = {}
  ): Promise<JsonRecord | null> {
    const url = this.buildUrl(path, params);
    const maxRetries = options.retries ?? this.maxRetries;
    let lastError: ProviderError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await this.fetchOnce(url);
        if (!response.ok) {
          const retryable = RETRYABLE_STATUSES.has(response.status);
          const error = new ProviderError(
            `Audius request failed with status ${response.status}`,
            { status: response.status, retryable }
          );
          if (response.status === 404 && options.notFoundIsNull) {
            return null;
          }
          lastError = error;
          if (retryable && attempt < maxRetries) {
            await sleep(BACKOFF_MS * 2 ** attempt);
            continue;
          }
          throw error;
        }
        const json = await response.json().catch(() => null);
        if (!isJsonRecord(json)) {
          lastError = new ProviderError("Malformed JSON response from Audius", {
            retryable: true,
          });
          if (attempt < maxRetries) {
            await sleep(BACKOFF_MS * 2 ** attempt);
            continue;
          }
          throw lastError;
        }
        return json;
      } catch (err) {
        if (err instanceof ProviderError) {
          if (attempt >= maxRetries) {
            logger.error("provider.request.failed", {
              provider: "audius",
              path,
              attempts: attempt + 1,
              error: err.message,
            });
          }
          throw err;
        }
        lastError = new ProviderError("Audius provider unreachable", {
          retryable: true,
          status: err instanceof Error && err.name === "AbortError" ? undefined : 0,
        });
        if (attempt < maxRetries) {
          await sleep(BACKOFF_MS * 2 ** attempt);
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new ProviderError("Audius provider request failed", {
      retryable: true,
    });
  }

  private buildUrl(path: string, params: Record<string, string | number>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("app_name", APP_NAME);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  private async fetchOnce(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "yaazh-music-backend",
    };
    if (env.audiusApiKey) {
      headers["X-API-Key"] = env.audiusApiKey;
    }
    try {
      return await fetch(url, { signal: controller.signal, headers });
    } finally {
      clearTimeout(timer);
    }
  }

  private readResults(payload: JsonRecord): unknown {
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }

  private readResult(payload: JsonRecord): unknown {
    if (payload.data !== undefined && payload.data !== null) return payload.data;
    if (Array.isArray(payload.results) && (payload.results as unknown[]).length > 0) {
      return (payload.results as unknown[])[0];
    }
    return null;
  }
}

export const audiusProvider = new AudiusProvider();
