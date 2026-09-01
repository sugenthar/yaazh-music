import { Router } from "express";
import { getArtist, getArtists } from "../controllers/artistController";
import { validateParams } from "../middleware/validate";
import { idParamSchema } from "../validations/schemas";

const router = Router();

router.get("/", getArtists);
router.get("/:id", validateParams(idParamSchema), getArtist);

export default router;