import { AuthRepositoryContext } from "./types";

export interface MoodRepository {
  list(limit?: number): unknown[];
  create(input: {
    text: string;
    userId: number | null;
    userName: string | null;
    color: string;
    songTitle: string | null;
  }): unknown;
}

export const createMoodRepository = (ctx: AuthRepositoryContext): MoodRepository => ({
  list(limit = 100) {
    return ctx.db
      .prepare("SELECT * FROM moods ORDER BY created_at DESC, id DESC LIMIT ?")
      .all(limit);
  },

  create({ text, userId, userName, color, songTitle }) {
    const result = ctx.db
      .prepare(
        "INSERT INTO moods (text, user_id, user_name, color, song_title) VALUES (?, ?, ?, ?, ?)"
      )
      .run(text, userId, userName, color, songTitle);
    return ctx.db.prepare("SELECT * FROM moods WHERE id = ?").get(result.lastInsertRowid);
  },
});
