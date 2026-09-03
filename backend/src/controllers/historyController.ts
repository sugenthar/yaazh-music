import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { resolveSongSnapshot } from "../modules/music/music.service";
import { asyncHandler, ok } from "../utils/helpers";
import env from "../config/env";
import { logger } from "../utils/logger";
import { history } from "../repositories";

export const addHistoryEntry = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { songId, song: rawSong } = req.body as { songId: string; song?: unknown };

  try {
    const song = await resolveSongSnapshot(songId, rawSong);
    history.add(userId, songId, song ? JSON.stringify(song) : null);
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

  const limit = Math.min(Math.max(1, env.historyMaxEntries), 1000);
  const entries = history.list(userId, limit);

  const parsed = entries.map((entry) => {
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

  ok(res, { history: parsed });
});

export const clearHistory = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const deleted = history.clear(userId);
  ok(res, { cleared: true, deleted });
});
