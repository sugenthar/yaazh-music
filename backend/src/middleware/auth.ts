import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { AuthenticationError } from "../utils/helpers";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AuthenticationError());
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next(new AuthenticationError());
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      algorithms: [env.jwtAlgorithm],
    }) as { id: number; email: string; name: string };
    if (!Number.isInteger(decoded.id) || typeof decoded.email !== "string") {
      return next(new AuthenticationError());
    }
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      name: typeof decoded.name === "string" ? decoded.name : "",
    };
    next();
  } catch {
    return next(new AuthenticationError("Invalid or expired token"));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret, {
          algorithms: [env.jwtAlgorithm],
        }) as {
          id: number;
          email: string;
          name: string;
        };
        if (Number.isInteger(decoded.id) && typeof decoded.email === "string") {
          (req as AuthRequest).user = {
            id: decoded.id,
            email: decoded.email,
            name: typeof decoded.name === "string" ? decoded.name : "",
          };
        }
      } catch {
        // Ignore invalid token for optional auth
      }
    }
  }
  next();
};
