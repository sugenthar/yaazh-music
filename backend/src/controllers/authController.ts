import { Request, Response } from "express";
import {
  createUser,
  verifyCredentials,
  getUserByIdOrThrow,
} from "../services/authService";
import { asyncHandler, AppError, ok } from "../utils/helpers";
import { AuthRequest } from "../middleware/auth";

export const register = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };
    const result = await createUser({ name, email, password });
    ok(res, result, 201);
  }
);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await verifyCredentials(email, password);
  ok(res, result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  const user = getUserByIdOrThrow(authReq.user.id);
  ok(res, { user });
});