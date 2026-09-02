import { Request, Response } from "express";
import { getDb } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { resolveSongSnapshot } from "../modules/music/music.service";
import { asyncHandler, ok } from "../utils/helpers";

export const addHistoryEntry = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { songId, song: rawSong } = req.body as { songId: string; song?: unknown };

  const song = await resolveSongSnapshot(songId, rawSong);

  const db = getDb();
  db.prepare(
    "INSERT INTO listening_history (user_id, song_id, song_json) VALUES (?, ?, ?)"
  ).run(userId, songId, song ? JSON.stringify(song) : null);
  ok(res, { recorded: true, songId }, 201);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();

  const entries = db
    .prepare(
      `SELECT song_id, song_json, played_at FROM listening_history
       WHERE user_id = ?
       ORDER BY played_at DESC
       LIMIT 100`
    )
    .all(userId) as { song_id: string; song_json: string | null; played_at: string }[];

  const history = entries.map((entry) => {
    const snapshot = entry.song_json ? JSON.parse(entry.song_json) : null;
    return {
      song: snapshot || { id: entry.song_id, songId: entry.song_id },
      playedAt: entry.played_at,
    };
  });

  ok(res, { history });
});