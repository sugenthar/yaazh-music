import { Router } from "express";
import { getAllSongs, getSong, searchAll } from "../controllers/songController";
import { validateParams, validateQuery } from "../middleware/validate";
import { songSourceIdParamSchema, searchQuerySchema, paginationQuerySchema } from "../validations/schemas";
import { publicCacheHeaders } from "../middleware/cacheHeaders";

const router = Router();

router.get("/", publicCacheHeaders, validateQuery(paginationQuerySchema), getAllSongs);
router.get("/search", publicCacheHeaders, validateQuery(searchQuerySchema), searchAll);
router.get("/:id", publicCacheHeaders, validateParams(songSourceIdParamSchema), getSong);

export default router;
