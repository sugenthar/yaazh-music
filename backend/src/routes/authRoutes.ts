import { Router } from "express";
import { login, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { noCacheHeaders } from "../middleware/cacheHeaders";
import { loginSchema, registerSchema } from "../validations/schemas";

const router = Router();

router.use(noCacheHeaders);

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
