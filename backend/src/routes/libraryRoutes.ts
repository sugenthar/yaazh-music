import { Router } from "express";
import { getLibrary } from "../controllers/likeController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, getLibrary);

export default router;