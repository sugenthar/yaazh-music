import { AuthRepositoryContext } from "./types";

interface PlaylistRow {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

interface PlaylistSongRow {
  song_id: string;
  song_json: string | null;
  added_at: string;
}

export interface PlaylistRepository {
  listForUser(userId: number): PlaylistRow[];
  findOwned(userId: number, playlistId: number): PlaylistRow | null;
  findById(playlistId: number): PlaylistRow | null;
  create(userId: number, name: string, description: string | null): PlaylistRow;
  update(playlistId: number, name: string, description: string | null): void;
  delete(playlistId: number): void;
  songsFor(playlistId: number): PlaylistSongRow[];
  songExists(playlistId: number, songId: string): boolean;
  addSong(playlistId: number, songId: string, songJson: string | null): { added: boolean; created: boolean };
  removeSong(playlistId: number, songId: string): boolean;
}

export const createPlaylistRepository = (ctx: AuthRepositoryContext): PlaylistRepository => {
  const rowsAs = (rows: unknown): PlaylistRow[] => rows as PlaylistRow[];

  return {
    listForUser(userId) {
      const rows = ctx.db
        .prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC")
        .all(userId);
      return rowsAs(rows);
    },

    findOwned(userId, playlistId) {
      return (ctx.db
        .prepare("SELECT * FROM playlists WHERE id = ? AND user_id = ?")
        .get(playlistId, userId) as PlaylistRow | undefined) || null;
    },

    findById(playlistId) {
      return (ctx.db
        .prepare("SELECT * FROM playlists WHERE id = ?")
        .get(playlistId) as PlaylistRow | undefined) || null;
    },

    create(userId, name, description) {
      const result = ctx.db
        .prepare("INSERT INTO playlists (name, description, user_id) VALUES (?, ?, ?)")
        .run(name.trim(), description?.trim() || null, userId);
      return ctx.db
        .prepare("SELECT * FROM playlists WHERE id = ?")
        .get(result.lastInsertRowid) as PlaylistRow;
    },

    update(playlistId, name, description) {
      ctx.db
        .prepare("UPDATE playlists SET name = ?, description = ? WHERE id = ?")
        .run(name.trim(), description?.trim() || null, playlistId);
    },

    delete(playlistId) {
      ctx.inTransaction(() => {
        ctx.db.prepare("DELETE FROM playlist_songs WHERE playlist_id = ?").run(playlistId);
        ctx.db.prepare("DELETE FROM playlists WHERE id = ?").run(playlistId);
      });
    },

    songsFor(playlistId) {
      return ctx.db
        .prepare(
          `SELECT song_id, song_json, added_at FROM playlist_songs
           WHERE playlist_id = ?
           ORDER BY added_at ASC`
        )
        .all(playlistId) as PlaylistSongRow[];
    },

    songExists(playlistId, songId) {
      return !!ctx.db
        .prepare("SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?")
        .get(playlistId, songId);
    },

    addSong(playlistId, songId, songJson) {
      if (this.songExists(playlistId, songId)) {
        return { added: true, created: false };
      }
      ctx.inTransaction(() => {
        ctx.db
          .prepare(
            "INSERT INTO playlist_songs (playlist_id, song_id, song_json) VALUES (?, ?, ?)"
          )
          .run(playlistId, songId, songJson);
      });
      return { added: true, created: true };
    },

    removeSong(playlistId, songId) {
      const result = ctx.db
        .prepare("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?")
        .run(playlistId, songId);
      return result.changes > 0;
    },
  };
};
