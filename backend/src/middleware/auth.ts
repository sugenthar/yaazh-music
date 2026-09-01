import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { AppError } from "../utils/helpers";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { id: number; email: string; name: string };
    (req as AuthRequest).user = { id: decoded.id, email: decoded.email, name: decoded.name };
    next();
  } catch {
    return next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), env.jwtSecret) as {
        id: number;
        email: string;
        name: string;
      };
      (req as AuthRequest).user = { id: decoded.id, email: decoded.email, name: decoded.name };
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
};