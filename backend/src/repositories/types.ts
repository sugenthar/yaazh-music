import type Database from "better-sqlite3";

export interface AuthRepositoryContext {
  db: Database.Database;
  inTransaction: <T>(fn: () => T) => T;
}
