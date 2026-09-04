import { AuthRepositoryContext } from "./types";
import { Banner, BannerInput, BannerType, PublicBanner } from "../types";

export interface BannerRepository {
  listByType(type: BannerType): PublicBanner[];
  count(): number;
  seed(input: BannerInput): PublicBanner | null;
}

const toPublicBanner = (row: Banner): PublicBanner => ({
  id: row.id,
  type: row.type,
  title: row.title,
  subtitle: row.subtitle,
  action: {
    type: row.action_type,
    target: row.action_target,
  },
  imageKey: row.image_key,
  imageUrl: row.image_url,
});

export const createBannerRepository = (ctx: AuthRepositoryContext): BannerRepository => ({
  listByType(type) {
    const rows = ctx.db
      .prepare(
        "SELECT * FROM banners WHERE type = ? AND enabled = 1 ORDER BY position ASC, id ASC"
      )
      .all(type) as unknown as Banner[];
    return rows.map(toPublicBanner);
  },

  count() {
    const row = ctx.db.prepare("SELECT COUNT(*) AS n FROM banners").get() as { n: number };
    return row.n;
  },

  seed(input) {
    if (input.type === undefined || !input.title) return null;
    const existing = ctx.db
      .prepare(
        "SELECT id FROM banners WHERE type = ? AND image_key IS ?"
      )
      .get(input.type, input.imageKey ?? null) as { id: number } | undefined;
    if (existing) return null;

    const result = ctx.db
      .prepare(
        `INSERT INTO banners
         (type, title, subtitle, action_type, action_target, image_key, image_url, enabled, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.type,
        input.title,
        input.subtitle ?? null,
        input.actionType ?? "none",
        input.actionTarget ?? null,
        input.imageKey ?? null,
        input.imageUrl ?? null,
        input.enabled ?? 1,
        input.position ?? 0
      );
    const row = ctx.db
      .prepare("SELECT * FROM banners WHERE id = ?")
      .get(result.lastInsertRowid) as unknown as Banner;
    return toPublicBanner(row);
  },
});
