import { z } from "zod";
import env from "../config/env";

const passwordMin = env.passwordMinLength;

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(254, "Email is too long"),
  password: z
    .string({ required_error: "Password is required" })
    .min(passwordMin, `Password must be at least ${passwordMin} characters`)
    .max(100, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(254, "Email is too long"),
  password: z.string({ required_error: "Password is required" }).min(1).max(100),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid id").max(Number.MAX_SAFE_INTEGER),
});

export const songSourceIdParamSchema = z.object({
  id: z.string().trim().min(1, "Invalid song id").max(200, "Song id too long"),
});

export const songIdParamSchema = z.object({
  songId: z.string().trim().min(1, "Invalid song id").max(200, "Song id too long"),
});

export const playlistSongParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid id").max(Number.MAX_SAFE_INTEGER),
  songId: z.string().trim().min(1, "Invalid song id").max(200, "Song id too long"),
});

export const playlistNameSchema = z.object({
  name: z
    .string({ required_error: "Playlist name is required" })
    .trim()
    .min(1, "Playlist name is required")
    .max(100, "Playlist name is too long"),
  description: z.string().trim().max(500).optional(),
});

export const playlistUpdateSchema = z.object({
  name: z.string().trim().min(1, "Playlist name cannot be empty").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

const songSnapshotSchema = z
  .object({
    id: z.string().min(1).max(200).optional(),
    title: z.string().max(500).optional(),
    artist: z.string().max(500).optional(),
    album: z.string().max(500).optional(),
    artworkUrl: z.string().url().max(2000).nullable().optional(),
    audioUrl: z.string().max(2000).nullable().optional(),
    duration: z.number().int().min(0).max(86_400_000).optional(),
    source: z.string().max(50).optional(),
    sourceId: z.string().max(200).optional(),
  })
  .passthrough();

export const addPlaylistSongSchema = z.object({
  songId: z.string().trim().min(1, "Invalid song id").max(200, "Song id too long"),
  song: songSnapshotSchema.optional(),
});

export const songIdBodySchema = z.object({
  songId: z.string().trim().min(1, "Invalid song id").max(200, "Song id too long"),
  song: songSnapshotSchema.optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(200),
});

export const musicSearchSchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(100, "Search query is too long"),
  page: z.coerce.number().int().positive("Invalid page").max(10_000).optional(),
  limit: z.coerce.number().int().positive("Invalid limit").optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive("Invalid page").max(10_000).optional(),
  limit: z.coerce.number().int().positive("Invalid limit").optional(),
});

export const moodCreateSchema = z.object({
  text: z
    .string({ required_error: "Mood text is required" })
    .trim()
    .min(1, "Mood text is required")
    .max(500, "Mood text is too long"),
  songTitle: z.string().trim().max(200).optional(),
  color: z.string().trim().max(20).default("#D8C5A8"),
});
