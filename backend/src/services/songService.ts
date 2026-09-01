import env from "../config/env";
import { getDb } from "../config/database";
import { AppError } from "../utils/helpers";
import { GitHubSong, Song } from "../types";

let cache: Song[] | null = null;
let lastSync = 0;
const SYNC_TTL_MS = 10 * 60 * 1000;

export const fetchSongsFromGithub = async (): Promise<GitHubSong[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(env.githubSongsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "yaazh-music-backend" },
    });
    if (!response.ok) {
      throw new Error(`GitHub songs fetch failed with status ${response.status}`);
    }
    const json = (await response.json()) as { songs?: GitHubSong[] };
    if (!json.songs || json.songs.length === 0) {
      throw new Error("GitHub songs response empty");
    }
    return json.songs;
  } finally {
    clearTimeout(timeout);
  }
};

export const syncSongsFromGithub = async (): Promise<Song[]> => {
  const db = getDb();

  // Use cache when fresh
  if (cache && Date.now() - lastSync < SYNC_TTL_MS) {
    return cache;
  }

  try {
    const githubSongs = await fetchSongsFromGithub();
    const insert = db.prepare(`
      INSERT INTO songs (external_id, title, artist, artwork, url, duration, source)
      VALUES (?, ?, ?, ?, ?, ?, 'github')
      ON CONFLICT(external_id) DO UPDATE SET
        title = excluded.title,
        artist = excluded.artist,
        artwork = excluded.artwork,
        url = excluded.url,
        duration = excluded.duration
    `);

    const syncAll = db.transaction((songs: GitHubSong[]) => {
      for (const song of songs) {
        let externalId = song.id !== undefined ? String(song.id) : song.title;
        externalId = `github-${externalId}`;
        insert.run(
          externalId,
          song.title,
          song.artist,
          song.artwork || null,
          song.url,
          song.duration ?? null
        );
      }
    });

    syncAll(githubSongs);
    cache = listSongs();
    lastSync = Date.now();
    return cache;
  } catch (err) {
    // On GitHub failure, fall back to whatever is in the DB
    const dbSongs = listSongs();
    if (dbSongs.length > 0) {
      cache = dbSongs;
      lastSync = Date.now();
      return dbSongs;
    }
    throw err;
  }
};

export const listSongs = (): Song[] => {
  const db = getDb();
  return db.prepare("SELECT * FROM songs ORDER BY id ASC").all() as Song[];
};

export const ensureSongsLoaded = async (): Promise<Song[]> => {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as count FROM songs").get() as { count: number };
  if (count.count === 0) {
    return syncSongsFromGithub();
  }
  return listSongs();
};

export const getSongById = (id: number): Song | undefined => {
  const db = getDb();
  return db.prepare("SELECT * FROM songs WHERE id = ?").get(id) as Song | undefined;
};

export const searchSongs = (query: string): Song[] => {
  const db = getDb();
  const term = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM songs
       WHERE title LIKE ? OR artist LIKE ?
       ORDER BY title ASC`
    )
    .all(term, term) as Song[];
};

export const resolveSongId = async (songId: number): Promise<Song> => {
  // Ensure catalog is loaded so external song ids resolve
  await ensureSongsLoaded();
  const song = getSongById(songId);
  if (!song) {
    throw new AppError("Song not found", 404, "SONG_NOT_FOUND");
  }
  return song;
};

export const resetSongCache = () => {
  cache = null;
  lastSync = 0;
};