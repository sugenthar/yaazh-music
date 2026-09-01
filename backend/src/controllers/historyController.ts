import { Request, Response } from "express";
import { getDb } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { resolveSongId } from "../services/songService";
import { asyncHandler, ok } from "../utils/helpers";

export const addHistoryEntry = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = Number(req.body.songId);

  await resolveSongId(songId);

  const db = getDb();
  db.prepare("INSERT INTO listening_history (user_id, song_id) VALUES (?, ?)").run(
    userId,
    songId
  );
  ok(res, { recorded: true, songId }, 201);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const db = getDb();

  const entries = db
    .prepare(
      `SELECT s.*, h.played_at FROM listening_history h
       INNER JOIN songs s ON s.id = h.song_id
       WHERE h.user_id = ?
       ORDER BY h.played_at DESC
       LIMIT 100`
    )
    .all(userId) as unknown[];

  ok(res, { history: entries });
});