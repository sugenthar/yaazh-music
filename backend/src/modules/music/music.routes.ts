import { Router } from "express";
import {
  searchMusicController,
  musicHealthController,
} from "./music.controller";
import { validateQuery } from "../../middleware/validate";
import { musicSearchSchema } from "../../validations/schemas";

const router = Router();

router.get("/health", musicHealthController);

router.get("/search", validateQuery(musicSearchSchema), searchMusicController);

export default router;