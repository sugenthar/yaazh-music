import { Request, Response } from "express";
import { asyncHandler, AppError, ok } from "../utils/helpers";
import {
  searchMusic,
  getDefaultFeed,
  getSongBySourceId,
  enforcePage,
  enforceLimit,
} from "../modules/music/music.service";

export const getAllSongs = asyncHandler(async (req: Request, res: Response) => {
  const page = enforcePage(req.query.page);
  const limit = enforceLimit(req.query.limit);
  const result = await getDefaultFeed(page, limit);
  ok(res, {
    songs: result.songs,
    page: result.page,
    limit: result.limit,
    hasNextPage: result.hasNextPage,
  });
});

export const getSong = asyncHandler(async (req: Request, res: Response) => {
  const song = await getSongBySourceId(req.params.id);
  ok(res, { song });
});

export const searchAll = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) || "";
  if (!q.trim()) {
    throw new AppError("Search query is required", 400, "INVALID_REQUEST");
  }
  const page = enforcePage(req.query.page);
  const limit = enforceLimit(req.query.limit);
  const result = await searchMusic(q.trim(), page, limit);
  ok(res, {
    songs: result.songs,
    query: q,
    count: result.songs.length,
    page: result.page,
    limit: result.limit,
    hasNextPage: result.hasNextPage,
  });
});