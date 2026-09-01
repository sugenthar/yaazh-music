import { Router } from "express";
import { getAlbum, getAlbums } from "../controllers/albumController";
import { validateParams } from "../middleware/validate";
import { idParamSchema } from "../validations/schemas";

const router = Router();

router.get("/", getAlbums);
router.get("/:id", validateParams(idParamSchema), getAlbum);

export default router;