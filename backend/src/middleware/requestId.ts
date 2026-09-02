import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-request-id"];
  const id = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
  (req as Request & { id?: string }).id = id;
  res.setHeader("X-Request-Id", id);
  next();
};