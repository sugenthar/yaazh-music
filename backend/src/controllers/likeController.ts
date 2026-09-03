import { Request, Response } from "express";
import { getDb, runInTransaction } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { resolveSongSnapshot } from "../modules/music/music.service";
import { asyncHandler, ok } from "../utils/helpers";

const snapshotJson = (song: { id: string }): string => JSON.stringify(song);

const parseSnapshot = (json: string | null, fallbackId: string): unknown => {
  if (json) {
    try {
      const parsed = JSON.parse(json);
      return parsed || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const likeSong = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = req.params.songId;
  const rawSong = (req.body as { song?: unknown } | undefined)?.song;

  const song = await resolveSongSnapshot(songId, rawSong);

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM likes WHERE user_id = ? AND song_id = ?")
    .get(userId, songId);

  if (existing) {
    return ok(res, { liked: true, songId }, 200);
  }

  runInTransaction(() => {
    db.prepare(
      "INSERT INTO likes (user_id, song_id, song_json) VALUES (?, ?, ?)"
    ).run(userId, songId, song ? snapshotJson(song) : null);
  });
  ok(res, { liked: true, songId }, 201);
});

export const unlikeSong = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = req.params.songId;

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
      `SELECT song_id, song_json, created_at FROM likes
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(userId) as { song_id: string; song_json: string | null; created_at: string }[];

  const likedSongs = likedRows.map((row) => {
    const snapshot = parseSnapshot(row.song_json, row.song_id);
    return (
      snapshot || {
        id: row.song_id,
        songId: row.song_id,
        artwork: null,
        url: null,
      }
    );
  });

  const playlistRows = db
    .prepare("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as unknown[];

  ok(res, { likedSongs, playlists: playlistRows });
});

export const getLikedSongIds = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();
  const rows = db
    .prepare("SELECT song_id FROM likes WHERE user_id = ?")
    .all(userId) as { song_id: string }[];

  ok(res, { songIds: rows.map((r) => r.song_id) });
});

export const isLiked = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = req.params.songId;
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM likes WHERE user_id = ? AND song_id = ?")
    .get(userId, songId);
  ok(res, { liked: !!existing });
});
