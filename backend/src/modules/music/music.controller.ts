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
import { providerManager } from "./providerManager";

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
  const providerStatuses = await checkMusicHealth();

  const detailedStatuses = await Promise.all(
    providerStatuses.map(async (ps) => {
      const provider = providerManager.getProvider(ps.name);
      let healthStatus = ps.isAvailable ? "available" : "unavailable";
      let latencyMs = 0;
      try {
        if (provider) {
          const h = await provider.health();
          healthStatus = h.status;
          latencyMs = h.latencyMs;
        }
      } catch {
        healthStatus = "unavailable";
      }
      return {
        name: ps.name,
        priority: ps.priority,
        status: healthStatus,
        latencyMs,
        circuitState: ps.circuitState,
        stats: ps.stats,
      };
    })
  );

  const primary = detailedStatuses.find((p) => p.name === "audius") || detailedStatuses[0];

  ok(res, {
    provider: {
      name: primary?.name || "audius",
      status: primary?.status || "unavailable",
      latencyMs: primary?.latencyMs || 0,
    },
    providers: detailedStatuses,
  });
});
