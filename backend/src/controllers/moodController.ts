import { Request, Response } from "express";
import { getDb } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler, ok } from "../utils/helpers";

export const getMoods = asyncHandler(async (_req: Request, res: Response) => {
  const db = getDb();
  const moods = db
    .prepare("SELECT * FROM moods ORDER BY created_at DESC, id DESC LIMIT 100")
    .all() as unknown[];
  ok(res, { moods });
});

export const createMood = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const db = getDb();
  const { text, songTitle, color } = req.body as {
    text: string;
    songTitle?: string;
    color?: string;
  };

  const userId = authReq.user?.id ?? null;
  const userName = authReq.user?.name ?? null;

  const result = db
    .prepare(
      "INSERT INTO moods (text, user_id, user_name, color, song_title) VALUES (?, ?, ?, ?, ?)"
    )
    .run(text.trim(), userId, userName, color || "#D8C5A8", songTitle?.trim() || null);

  const mood = db
    .prepare("SELECT * FROM moods WHERE id = ?")
    .get(result.lastInsertRowid);
  ok(res, { mood }, 201);
});