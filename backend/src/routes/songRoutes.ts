import { Router } from "express";
import { getAllSongs, getSong, searchAll } from "../controllers/songController";
import { validateParams, validateQuery } from "../middleware/validate";
import { idParamSchema, searchQuerySchema } from "../validations/schemas";

const router = Router();

router.get("/", getAllSongs);
router.get("/search", validateQuery(searchQuerySchema), searchAll);
router.get("/:id", validateParams(idParamSchema), getSong);

export default router;