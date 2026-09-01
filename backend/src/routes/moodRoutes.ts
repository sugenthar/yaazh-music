import { Router } from "express";
import { createMood, getMoods } from "../controllers/moodController";
import { optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { moodCreateSchema } from "../validations/schemas";

const router = Router();

router.get("/", getMoods);
router.post("/", optionalAuth, validateBody(moodCreateSchema), createMood);

export default router;