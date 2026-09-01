import { Request, Response } from "express";
import { getDb } from "../config/database";
import { ensureSongsLoaded } from "../services/songService";
import { asyncHandler, ok } from "../utils/helpers";

export const getAlbums = asyncHandler(async (_req: Request, res: Response) => {
  await ensureSongsLoaded();
  const db = getDb();
  const rows = db.prepare("SELECT * FROM albums ORDER BY title ASC").all() as unknown[];
  ok(res, { albums: rows });
});

export const getAlbum = asyncHandler(async (req: Request, res: Response) => {
  await ensureSongsLoaded();
  const db = getDb();
  const id = Number(req.params.id);
  const album = db.prepare("SELECT * FROM albums WHERE id = ?").get(id) as
    | { id: number; title: string; artwork: string | null }
    | undefined;

  if (!album) {
    return ok(res, { album: null, songs: [], message: "Album catalog is not yet populated" });
  }

  const songs = db
    .prepare("SELECT * FROM songs WHERE album_id = ? ORDER BY title ASC")
    .all(id) as unknown[];
  ok(res, { album, songs });
});