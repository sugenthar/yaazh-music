import { Request, Response } from "express";
import { getDb } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { resolveSongSnapshot } from "../modules/music/music.service";
import { asyncHandler, ok } from "../utils/helpers";
import env from "../config/env";
import { logger } from "../utils/logger";

export const addHistoryEntry = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { songId, song: rawSong } = req.body as { songId: string; song?: unknown };

  const db = getDb();
  try {
    const song = await resolveSongSnapshot(songId, rawSong);
    db.prepare(
      "INSERT INTO listening_history (user_id, song_id, song_json) VALUES (?, ?, ?)"
    ).run(userId, songId, song ? JSON.stringify(song) : null);
    ok(res, { recorded: true, songId }, 201);
  } catch (err) {
    logger.warn("history.add.failed", {
      userId,
      songId,
      error: err instanceof Error ? err.message : "unknown",
    });
    throw err;
  }
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();

  const limit = Math.min(Math.max(1, env.historyMaxEntries), 1000);

  const entries = db
    .prepare(
      `SELECT song_id, song_json, played_at FROM listening_history
       WHERE user_id = ?
       ORDER BY played_at DESC, id DESC
       LIMIT ?`
    )
    .all(userId, limit) as { song_id: string; song_json: string | null; played_at: string }[];

  const history = entries.map((entry) => {
    let snapshot: unknown = null;
    if (entry.song_json) {
      try {
        snapshot = JSON.parse(entry.song_json);
      } catch {
        snapshot = null;
      }
    }
    return {
      song: snapshot || { id: entry.song_id, songId: entry.song_id },
      playedAt: entry.played_at,
    };
  });

  ok(res, { history });
});

export const clearHistory = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();
  const result = db
    .prepare("DELETE FROM listening_history WHERE user_id = ?")
    .run(userId);
  ok(res, { cleared: true, deleted: result.changes });
});
