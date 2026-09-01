import { Request, Response } from "express";
import { getDb } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { resolveSongId } from "../services/songService";
import { asyncHandler, ok, AppError } from "../utils/helpers";

export const likeSong = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = Number(req.params.songId);

  await resolveSongId(songId);

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM likes WHERE user_id = ? AND song_id = ?")
    .get(userId, songId);

  if (existing) {
    return ok(res, { liked: true, songId }, 200);
  }

  db.prepare("INSERT INTO likes (user_id, song_id) VALUES (?, ?)").run(userId, songId);
  ok(res, { liked: true, songId }, 201);
});

export const unlikeSong = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = Number(req.params.songId);

  const db = getDb();
  db.prepare("DELETE FROM likes WHERE user_id = ? AND song_id = ?").run(userId, songId);
  ok(res, { liked: false, songId });
});

export const getLibrary = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();

  const likedRows = db
    .prepare(
      `SELECT s.* FROM songs s
       INNER JOIN likes l ON l.song_id = s.id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC`
    )
    .all(userId) as unknown[];

  const playlistRows = db
    .prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as unknown[];

  ok(res, { likedSongs: likedRows, playlists: playlistRows });
});

export const getLikedSongIds = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();
  const rows = db
    .prepare("SELECT song_id FROM likes WHERE user_id = ?")
    .all(userId) as { song_id: number }[];

  ok(res, { songIds: rows.map((r) => r.song_id) });
});

export const isLiked = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = Number(req.params.songId);
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM likes WHERE user_id = ? AND song_id = ?")
    .get(userId, songId);
  ok(res, { liked: !!existing });
});