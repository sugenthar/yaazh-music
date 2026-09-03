import { AuthRepositoryContext } from "./types";

export interface HistoryRepository {
  add(userId: number, songId: string, songJson: string | null): void;
  list(userId: number, limit: number): { song_id: string; song_json: string | null; played_at: string }[];
  clear(userId: number): number;
}

export const createHistoryRepository = (ctx: AuthRepositoryContext): HistoryRepository => ({
  add(userId, songId, songJson) {
    ctx.db
      .prepare(
        "INSERT INTO listening_history (user_id, song_id, song_json) VALUES (?, ?, ?)"
      )
      .run(userId, songId, songJson);
  },

  list(userId, limit) {
    return ctx.db
      .prepare(
        `SELECT song_id, song_json, played_at FROM listening_history
         WHERE user_id = ?
         ORDER BY played_at DESC, id DESC
         LIMIT ?`
      )
      .all(userId, limit) as { song_id: string; song_json: string | null; played_at: string }[];
  },

  clear(userId) {
    const result = ctx.db
      .prepare("DELETE FROM listening_history WHERE user_id = ?")
      .run(userId);
    return result.changes;
  },
});
