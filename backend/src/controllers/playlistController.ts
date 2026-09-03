import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { resolveSongSnapshot } from "../modules/music/music.service";
import { asyncHandler, ok, AppError } from "../utils/helpers";
import { playlists } from "../repositories";

interface PlaylistRow {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
}

interface PlaylistSongRow {
  song_id: string;
  song_json: string | null;
  added_at: string;
}

const parseSnapshot = (row: PlaylistSongRow) => {
  if (row.song_json) {
    try {
      const parsed = JSON.parse(row.song_json);
      if (parsed && parsed.id) return parsed;
    } catch {
      // fall through
    }
  }
  return { id: row.song_id, songId: row.song_id };
};

const toPlaylistResponse = (row: PlaylistRow) => {
  const songRows = playlists.songsFor(row.id);
  const songs = songRows.map(parseSnapshot);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    songs,
    songCount: songs.length,
  };
};

const getOwnedPlaylist = (userId: number, playlistId: number): PlaylistRow | null =>
  playlists.findOwned(userId, playlistId);

export const getPlaylists = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const rows = playlists.listForUser(userId);
  ok(res, { playlists: rows.map(toPlaylistResponse) });
});

export const getPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }
  ok(res, { playlist: toPlaylistResponse(row) });
});

export const createPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { name, description } = req.body as { name: string; description?: string };
  const row = playlists.create(userId, name, description || null);
  ok(res, { playlist: toPlaylistResponse(row) }, 201);
});

export const updatePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const { name, description } = req.body as { name?: string; description?: string };

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  playlists.update(
    playlistId,
    name?.trim() || row.name,
    description !== undefined ? description.trim() || null : row.description
  );

  const updated = getOwnedPlaylist(userId, playlistId)!;
  ok(res, { playlist: toPlaylistResponse(updated) });
});

export const deletePlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  playlists.delete(playlistId);
  ok(res, { deleted: true, playlistId });
});

export const addSongToPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const { songId, song: rawSong } = req.body as { songId: string; song?: unknown };

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  const song = await resolveSongSnapshot(songId, rawSong);
  const { created } = playlists.addSong(playlistId, songId, song ? JSON.stringify(song) : null);
  ok(res, { added: true, songId }, created ? 201 : 200);
});

export const removeSongFromPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const playlistId = Number(req.params.id);
  const songId = req.params.songId;

  const row = getOwnedPlaylist(userId, playlistId);
  if (!row) {
    throw new AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND");
  }

  playlists.removeSong(playlistId, songId);
  ok(res, { removed: true, songId });
});
