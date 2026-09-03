import { Router } from "express";
import { addHistoryEntry, clearHistory, getHistory } from "../controllers/historyController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { noCacheHeaders } from "../middleware/cacheHeaders";
import { songIdBodySchema } from "../validations/schemas";

const router = Router();

router.use(noCacheHeaders, requireAuth);

router.get("/", getHistory);
router.post("/", validateBody(songIdBodySchema), addHistoryEntry);
router.delete("/", clearHistory);

export default router;
