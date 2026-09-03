import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import env from "../config/env";

const ID_VALIDATION = /^[A-Za-z0-9._-]{1,128}$/;

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const headerName = env.requestIdHeader.toLowerCase();
  const incoming = req.headers[headerName];
  let id: string;

  if (typeof incoming === "string" && ID_VALIDATION.test(incoming.trim())) {
    id = incoming.trim();
  } else {
    id = randomUUID();
  }

  (req as Request & { id?: string }).id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
