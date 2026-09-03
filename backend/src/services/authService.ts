import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { AppError, ConflictError, NotFoundError } from "../utils/helpers";
import { PublicUser, User } from "../types";
import { userRepository, toPublicUser } from "../repositories";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

const signToken = (user: PublicUser): string => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
      algorithm: env.jwtAlgorithm,
    }
  );
};

export const findUserByEmail = (email: string): User | undefined =>
  userRepository.findByEmail(email);

export const createUser = async (
  input: RegisterInput
): Promise<{ user: PublicUser; token: string }> => {
  const existing = findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const hash = await bcrypt.hash(input.password, env.bcryptRounds);
  const user = userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash: hash,
  });

  const publicUser = toPublicUser(user);
  return { user: publicUser, token: signToken(publicUser) };
};

export const verifyCredentials = async (
  email: string,
  password: string
): Promise<{ user: PublicUser; token: string }> => {
  const user = findUserByEmail(email);
  if (!user) {
    await bcrypt.compare(password, "$2a$10$N9qo8uLOickgx2ZMRZoMye");
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const publicUser = toPublicUser(user);
  return { user: publicUser, token: signToken(publicUser) };
};

export const getUserById = (id: number): PublicUser | null => {
  const user = userRepository.findById(id);
  return user ? toPublicUser(user) : null;
};

export const getUserByIdOrThrow = (id: number): PublicUser => {
  const user = getUserById(id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};
