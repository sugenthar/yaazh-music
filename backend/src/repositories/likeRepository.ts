import { AuthRepositoryContext } from "./types";

export const LIKE_REPO_ERROR_CODES = {
  DUPLICATE: "DUPLICATE",
} as const;

export interface LikeRepository {
  find(userId: number, songId: string): { id: number } | undefined;
  add(userId: number, songId: string, songJson: string | null): { added: boolean; created: boolean };
  remove(userId: number, songId: string): boolean;
  list(userId: number): { song_id: string; song_json: string | null; created_at: string }[];
  listSongIds(userId: number): string[];
  isLiked(userId: number, songId: string): boolean;
}

export const createLikeRepository = (ctx: AuthRepositoryContext): LikeRepository => {
  const find = (userId: number, songId: string) =>
    ctx.db
      .prepare("SELECT id FROM likes WHERE user_id = ? AND song_id = ?")
      .get(userId, songId) as { id: number } | undefined;

  return {
    find,

    add(userId, songId, songJson) {
      const existing = find(userId, songId);
      if (existing) {
        return { added: true, created: false };
      }
      ctx.inTransaction(() => {
        ctx.db
          .prepare("INSERT INTO likes (user_id, song_id, song_json) VALUES (?, ?, ?)")
          .run(userId, songId, songJson);
      });
      return { added: true, created: true };
    },

    remove(userId, songId) {
      const result = ctx.db
        .prepare("DELETE FROM likes WHERE user_id = ? AND song_id = ?")
        .run(userId, songId);
      return result.changes > 0;
    },

    list(userId) {
      return ctx.db
        .prepare(
          `SELECT song_id, song_json, created_at FROM likes
           WHERE user_id = ?
           ORDER BY created_at DESC, id DESC`
        )
        .all(userId) as {
        song_id: string;
        song_json: string | null;
        created_at: string;
      }[];
    },

    listSongIds(userId) {
      const rows = ctx.db
        .prepare("SELECT song_id FROM likes WHERE user_id = ?")
        .all(userId) as { song_id: string }[];
      return rows.map((r) => r.song_id);
    },

    isLiked(userId, songId) {
      return !!find(userId, songId);
    },
  };
};
