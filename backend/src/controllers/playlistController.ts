import { Request, Response } from "express";
import { getDb } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { resolveSongId } from "../services/songService";
import { asyncHandler, ok, AppError } from "../utils/helpers";

interface PlaylistRow {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

const toPlaylistResponse = (db: ReturnType<typeof getDb>, row: PlaylistRow) => {
  const songRows = db
    .prepare(
      `SELECT s.* FROM songs s
       INNER JOIN playlist_songs ps ON ps.song_id = s.id
       WHERE ps.playlist_id = ?
       ORDER BY ps.added_at ASC`
    )
    .all(row.id) as unknown[];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    songs: songRows,
    songCount: songRows.length,
  };
};

const getOwnedPlaylist = (userId: number, playlistId: number): PlaylistRow | null => {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM playlists WHERE id = ? AND user_id = ?")
      .get(playlistId, userId) as PlaylistRow | undefined) || null
  );
};

export const getPlaylists = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as PlaylistRow[];
  ok(res, { playlists: rows.map((r) => toPlaylistResponse(db, r)) });
});

export const getPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }
  ok(res, { playlist: toPlaylistResponse(getDb(), row) });
});

export const createPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { name, description } = req.body as { name: string; description?: string };
  const db = getDb();
  const result = db
    .prepare("INSERT INTO playlists (name, description, user_id) VALUES (?, ?, ?)")
    .run(name.trim(), description?.trim() || null, userId);
  const row = db
    .prepare("SELECT * FROM playlists WHERE id = ?")
    .get(result.lastInsertRowid) as PlaylistRow;
  ok(res, { playlist: toPlaylistResponse(db, row) }, 201);
});

export const updatePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const { name, description } = req.body as { name?: string; description?: string };
  const db = getDb();

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  db.prepare(
    "UPDATE playlists SET name = ?, description = ? WHERE id = ?"
  ).run(name?.trim() || row.name, description !== undefined ? (description.trim() || null) : row.description, playlistId);

  const updated = getOwnedPlaylist(userId, playlistId)!;
  ok(res, { playlist: toPlaylistResponse(db, updated) });
});

export const deletePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const db = getDb();

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  db.prepare("DELETE FROM playlists WHERE id = ?").run(playlistId);
  ok(res, { deleted: true, playlistId });
});

export const addSongToPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const songId = Number(req.body.songId);

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  await resolveSongId(songId);

  const db = getDb();
  const existing = db
    .prepare("SELECT 1 FROM playlist_songs WHERE playlist_id = ? AND song_id = ?")
    .get(playlistId, songId);
  if (existing) {
    return ok(res, { added: true, songId });
  }

  db.prepare("INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)").run(
    playlistId,
    songId
  );
  ok(res, { added: true, songId }, 201);
});

export const removeSongFromPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const songId = Number(req.params.songId);

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  const db = getDb();
  db.prepare("DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?").run(
    playlistId,
    songId
  );
  ok(res, { removed: true, songId });
});