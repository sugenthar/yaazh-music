import { getDb, runInTransaction } from "../config/database";
import { AuthRepositoryContext } from "./types";

/**
 * Context that resolves the database connection lazily (at call time) rather
 * than capturing a reference at module load. This keeps repositories correct
 * across test module resets and multi-instance connection re-initialisation.
 */
export const context = {
  get db() {
    return getDb();
  },
  inTransaction: <T>(fn: () => T): T => runInTransaction(fn),
};

export const createRepositoryContext = (): AuthRepositoryContext => ({
  get db() {
    return getDb();
  },
  inTransaction: <T>(fn: () => T): T => runInTransaction(fn),
});
