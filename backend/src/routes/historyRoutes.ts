import { Router } from "express";
import { addHistoryEntry, getHistory } from "../controllers/historyController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { songIdBodySchema } from "../validations/schemas";

const router = Router();

router.use(requireAuth);

router.get("/", getHistory);
router.post("/", validateBody(songIdBodySchema), addHistoryEntry);

export default router;