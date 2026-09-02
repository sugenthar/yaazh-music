import { Router } from "express";
import { z } from "zod";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  getPlaylists,
  removeSongFromPlaylist,
  updatePlaylist,
} from "../controllers/playlistController";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import {
  addPlaylistSongSchema,
  idParamSchema,
  playlistNameSchema,
  playlistUpdateSchema,
} from "../validations/schemas";

const playlistSongParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid id"),
  songId: z.string().min(1, "Invalid song id"),
});

const router = Router();

router.use(requireAuth);

router.get("/", getPlaylists);
router.post("/", validateBody(playlistNameSchema), createPlaylist);
router.get("/:id", validateParams(idParamSchema), getPlaylist);
router.patch("/:id", validateParams(idParamSchema), validateBody(playlistUpdateSchema), updatePlaylist);
router.delete("/:id", validateParams(idParamSchema), deletePlaylist);
router.post(
  "/:id/songs",
  validateParams(idParamSchema),
  validateBody(addPlaylistSongSchema),
  addSongToPlaylist
);
router.delete(
  "/:id/songs/:songId",
  validateParams(playlistSongParamSchema),
  removeSongFromPlaylist
);

export default router;