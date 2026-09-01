import { Request, Response } from "express";
import {
  ensureSongsLoaded,
  getSongById,
  searchSongs,
} from "../services/songService";
import { asyncHandler, AppError, ok } from "../utils/helpers";

export const getAllSongs = asyncHandler(async (_req: Request, res: Response) => {
  const songs = await ensureSongsLoaded();
  ok(res, { songs });
});

export const getSong = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await ensureSongsLoaded();
  const song = getSongById(id);
  if (!song) {
    throw new AppError("Song not found", 404, "SONG_NOT_FOUND");
  }
  ok(res, { song });
});

export const searchAll = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) || "";
  if (!q.trim()) {
    throw new AppError("Search query is required", 400, "INVALID_REQUEST");
  }
  await ensureSongsLoaded();
  const songs = searchSongs(q.trim());
  ok(res, { songs, query: q, count: songs.length });
});