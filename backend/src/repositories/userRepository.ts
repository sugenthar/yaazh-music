import { getDb, runInTransaction } from "../config/database";
import { User, PublicUser } from "../types";

const SELECT_USER = "SELECT * FROM users WHERE ";

export const userRepository = {
  findByEmail(email: string): User | undefined {
    const db = getDb();
    return db.prepare(`${SELECT_USER}email = ?`).get(email.toLowerCase()) as
      | User
      | undefined;
  },

  findById(id: number): User | undefined {
    const db = getDb();
    return db.prepare(`${SELECT_USER}id = ?`).get(id) as User | undefined;
  },

  create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): User {
    const db = getDb();
    const result = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(input.name.trim(), input.email.toLowerCase(), input.passwordHash);
    return db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid) as User;
  },
};

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.created_at,
});
