import { Request, Response } from "express";
import { getDb } from "../config/database";
import { ensureSongsLoaded } from "../services/songService";
import { asyncHandler, ok, AppError } from "../utils/helpers";

export const getArtists = asyncHandler(async (_req: Request, res: Response) => {
  await ensureSongsLoaded();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT artist AS name, COUNT(*) AS song_count
       FROM songs
       WHERE artist IS NOT NULL AND artist != ''
       GROUP BY artist
       ORDER BY artist ASC`
    )
    .all() as unknown[];
  const artists = rows.map((r: any, index: number) => ({
    id: index + 1,
    name: r.name,
    songCount: r.song_count,
  }));
  ok(res, { artists });
});

export const getArtist = asyncHandler(async (req: Request, res: Response) => {
  await ensureSongsLoaded();
  const db = getDb();
  const id = Number(req.params.id);

  const artists = db
    .prepare(
      `SELECT artist AS name, COUNT(*) AS song_count
       FROM songs
       GROUP BY artist
       ORDER BY artist ASC`
    )
    .all() as { name: string; song_count: number }[];
  const artist = artists[id - 1];

  if (!artist) {
    throw new AppError("Artist not found", 404, "ARTIST_NOT_FOUND");
  }

  const songs = db
    .prepare("SELECT * FROM songs WHERE artist = ? ORDER BY title ASC")
    .all(artist.name) as unknown[];

  ok(res, { artist: { id, name: artist.name, songCount: artist.song_count }, songs });
});