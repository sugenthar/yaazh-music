import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { resolveSongSnapshot } from "../modules/music/music.service";
import { asyncHandler, ok } from "../utils/helpers";
import { likes, playlists } from "../repositories";

const snapshotJson = (song: { id: string }): string => JSON.stringify(song);

const parseSnapshot = (json: string | null, fallbackId: string): unknown => {
  if (json) {
    try {
      const parsed = JSON.parse(json);
      return parsed || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const likeSong = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = req.params.songId;
  const rawSong = (req.body as { song?: unknown } | undefined)?.song;

  const song = await resolveSongSnapshot(songId, rawSong);

  const { created } = likes.add(userId, songId, song ? snapshotJson(song) : null);
  ok(res, { liked: true, songId }, created ? 201 : 200);
});

export const unlikeSong = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = req.params.songId;

  likes.remove(userId, songId);
  ok(res, { liked: false, songId });
});

export const getLibrary = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  const likedRows = likes.list(userId);
  const likedSongs = likedRows.map((row) => {
    const snapshot = parseSnapshot(row.song_json, row.song_id);
    return (
      snapshot || {
        id: row.song_id,
        songId: row.song_id,
        artwork: null,
        url: null,
      }
    );
  });

  const playlistRows = playlists.listForUser(userId);
  ok(res, { likedSongs, playlists: playlistRows });
});

export const getLikedSongIds = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  ok(res, { songIds: likes.listSongIds(userId) });
});

export const isLiked = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const songId = req.params.songId;
  ok(res, { liked: likes.isLiked(userId, songId) });
});
