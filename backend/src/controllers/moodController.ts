import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler, ok } from "../utils/helpers";
import { moods } from "../repositories";

export const getMoods = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, { moods: moods.list(100) });
});

export const createMood = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { text, songTitle, color } = req.body as {
    text: string;
    songTitle?: string;
    color?: string;
  };

  const userId = authReq.user?.id ?? null;
  const userName = authReq.user?.name ?? null;

  const mood = moods.create({
    text,
    userId,
    userName,
    color: color || "#D8C5A8",
    songTitle: songTitle?.trim() || null,
  });
  ok(res, { mood }, 201);
});
