import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const ok = (res: Response, data: unknown, status = 200) => {
  return res.status(status).json({ success: true, data });
};

export const fail = (res: Response, message: string, code: string, status: number) => {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};