import { Request, Response, NextFunction } from "express";

export const publicCacheHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  next();
};

export const noCacheHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};
