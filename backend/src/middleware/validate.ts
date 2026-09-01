import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/helpers";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Invalid request";
      return next(new AppError(message, 400, "INVALID_REQUEST"));
    }
    req.body = result.data;
    next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Invalid parameters";
      return next(new AppError(message, 400, "INVALID_REQUEST"));
    }
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues[0]?.message || "Invalid query";
      return next(new AppError(message, 400, "INVALID_REQUEST"));
    }
    req.query = result.data;
    next();
  };
};