import { Router } from "express";
import { getFeaturedBanners, getInlineBanners } from "../controllers/bannerController";
import { publicCacheHeaders } from "../middleware/cacheHeaders";

const router = Router();

router.use(publicCacheHeaders);

router.get("/featured", getFeaturedBanners);
router.get("/inline", getInlineBanners);

export default router;
