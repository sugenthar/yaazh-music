import { Router } from "express";
import {
  getLibrary,
  getLikedSongIds,
  isLiked,
  likeSong,
  unlikeSong,
} from "../controllers/likeController";
import { requireAuth } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { noCacheHeaders } from "../middleware/cacheHeaders";
import { songIdParamSchema } from "../validations/schemas";

const router = Router();

router.use(noCacheHeaders);

router.post("/:songId", requireAuth, validateParams(songIdParamSchema), likeSong);
router.delete("/:songId", requireAuth, validateParams(songIdParamSchema), unlikeSong);
router.get("/:songId/status", requireAuth, validateParams(songIdParamSchema), isLiked);
router.get("/me/all", requireAuth, getLikedSongIds);

export default router;
