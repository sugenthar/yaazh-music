import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { getDb } from "../config/database";
import { AppError } from "../utils/helpers";
import { PublicUser, User } from "../types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.created_at,
});

const signToken = (user: PublicUser): string => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] }
  );
};

export const findUserByEmail = (email: string): User | undefined => {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | User
    | undefined;
};

export const createUser = async (input: RegisterInput): Promise<{ user: PublicUser; token: string }> => {
  const db = getDb();
  const existing = findUserByEmail(input.email);
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const hash = await bcrypt.hash(input.password, env.bcryptRounds);
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(input.name, input.email.toLowerCase(), hash);

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as User;

  const publicUser = toPublicUser(user);
  return { user: publicUser, token: signToken(publicUser) };
};

export const verifyCredentials = async (
  email: string,
  password: string
): Promise<{ user: PublicUser; token: string }> => {
  const db = getDb();
  const user = findUserByEmail(email);
  if (!user) {
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
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
  return user ? toPublicUser(user) : null;
};