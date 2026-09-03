import { Router } from "express";
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
import { noCacheHeaders } from "../middleware/cacheHeaders";
import {
  addPlaylistSongSchema,
  idParamSchema,
  playlistNameSchema,
  playlistSongParamSchema,
  playlistUpdateSchema,
} from "../validations/schemas";

const router = Router();

router.use(noCacheHeaders, requireAuth);

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
