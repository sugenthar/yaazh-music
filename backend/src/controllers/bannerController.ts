import { Request, Response } from "express";
import { asyncHandler, ok } from "../utils/helpers";
import { banners } from "../repositories";

export const getFeaturedBanners = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, { banners: banners.listByType("featured") });
});

export const getInlineBanners = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, { banners: banners.listByType("inline") });
});
