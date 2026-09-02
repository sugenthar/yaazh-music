import { audiusProvider, ProviderHealth } from "./providers/audius.provider";
import { MusicSearchResult, YaazhSong } from "./music.types";
import { AppError } from "../../utils/helpers";

export const PROVIDER_UNAVAILABLE_CODE = "MUSIC_PROVIDER_UNAVAILABLE";
export const PROVIDER_UNAVAILABLE_MESSAGE = "Music service is temporarily unavailable.";

export const MAX_LIMIT = 20;
export const DEFAULT_LIMIT = 20;
export const DEFAULT_PAGE = 1;
export const DEFAULT_FEED_QUERY = "Tamil";

export const enforceLimit = (requested: unknown): number => {
  const parsed = Number(requested);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
};

export const enforcePage = (requested: unknown): number => {
  const parsed = Number(requested);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE;
  return Math.floor(parsed);
};

export const searchMusic = async (
  query: string,
  page?: unknown,
  limit?: unknown
): Promise<MusicSearchResult> => {
  const effectivePage = enforcePage(page);
  const effectiveLimit = enforceLimit(limit);
  let result;
  try {
    result = await audiusProvider.search(query, effectivePage, effectiveLimit);
  } catch (err) {
    throw new AppError(PROVIDER_UNAVAILABLE_MESSAGE, 503, PROVIDER_UNAVAILABLE_CODE);
  }
  return {
    query,
    page: effectivePage,
    limit: effectiveLimit,
    songs: result.songs,
    hasNextPage: result.hasNextPage,
  };
};

export const getDefaultFeed = async (
  page?: unknown,
  limit?: unknown
): Promise<MusicSearchResult> => searchMusic(DEFAULT_FEED_QUERY, page, limit);

export const getSongBySourceId = async (songId: string): Promise<YaazhSong> => {
  let song;
  try {
    song = await audiusProvider.getById(songId);
  } catch (err) {
    throw new AppError(PROVIDER_UNAVAILABLE_MESSAGE, 503, PROVIDER_UNAVAILABLE_CODE);
  }
  if (!song) {
    throw new AppError("Song not found", 404, "SONG_NOT_FOUND");
  }
  return song;
};

export const checkMusicHealth = async (): Promise<ProviderHealth> => {
  try {
    return await audiusProvider.health();
  } catch (err) {
    return { status: "unavailable", latencyMs: 0 };
  }
};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

export const toSongSnapshot = (raw: unknown): YaazhSong | null => {
  if (!raw || typeof raw !== "object") return null;
  const song = raw as Record<string, unknown>;
  if (!song.id) return null;
  const sourceId = asString(song.sourceId).replace(/^audius-/, "") || asString(song.id).replace(/^audius-/, "");
  return {
    id: asString(song.id),
    title: asString(song.title),
    artist: asString(song.artist),
    artists: Array.isArray(song.artists) ? song.artists.map(asString) : undefined,
    album: asString(song.album),
    artworkUrl: (song.artworkUrl as string) ?? (song.artwork as string) ?? null,
    audioUrl: (song.audioUrl as string) ?? (song.url as string) ?? null,
    duration: Number(song.duration) || 0,
    language: song.language ? asString(song.language) : undefined,
    year: song.year ? Number(song.year) : undefined,
    source: (song.source as string) || "audius",
    sourceId,
  };
};

export const resolveSongSnapshot = async (
  songId: string,
  rawSong?: unknown
): Promise<YaazhSong> => {
  const provided = toSongSnapshot(rawSong);
  if (provided && provided.id === songId) {
    return provided;
  }
  return getSongBySourceId(songId);
};