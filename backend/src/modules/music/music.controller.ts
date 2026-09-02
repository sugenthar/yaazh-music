import { Request, Response } from "express";
import { asyncHandler, AppError, ok } from "../../utils/helpers";
import {
  searchMusic,
  getDefaultFeed,
  getSongBySourceId,
  checkMusicHealth,
  enforcePage,
  enforceLimit,
} from "./music.service";
import { MusicSearchResponse } from "./music.types";

export const searchMusicController = asyncHandler(
  async (req: Request, res: Response) => {
    const rawQuery = (req.query.q as string) || "";
    const query = rawQuery.trim();
    if (!query) {
      throw new AppError("Search query is required", 400, "INVALID_REQUEST");
    }

    const page = enforcePage(req.query.page);
    const limit = enforceLimit(req.query.limit);
    const result = await searchMusic(query, page, limit);

    const response: MusicSearchResponse = {
      success: true,
      query: result.query,
      page: result.page,
      limit: result.limit,
      songs: result.songs,
      pagination: {
        page: result.page,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
      },
    };
    ok(res, response);
  }
);

export const defaultFeedController = asyncHandler(
  async (req: Request, res: Response) => {
    const page = enforcePage(req.query.page);
    const limit = enforceLimit(req.query.limit);
    const result = await getDefaultFeed(page, limit);
    ok(res, {
      songs: result.songs,
      page: result.page,
      limit: result.limit,
      hasNextPage: result.hasNextPage,
    });
  }
);

export const singleSongController = asyncHandler(
  async (req: Request, res: Response) => {
    const song = await getSongBySourceId(req.params.id);
    ok(res, { song });
  }
);

export const musicHealthController = asyncHandler(async (_req: Request, res: Response) => {
  const health = await checkMusicHealth();
  ok(res, {
    provider: {
      name: "audius",
      status: health.status,
      latencyMs: health.latencyMs,
    },
  });
});