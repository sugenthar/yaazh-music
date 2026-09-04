import { Router } from "express";
import authRoutes from "./authRoutes";
import songRoutes from "./songRoutes";
import likeRoutes from "./likeRoutes";
import playlistRoutes from "./playlistRoutes";
import historyRoutes from "./historyRoutes";
import moodRoutes from "./moodRoutes";
import bannerRoutes from "./bannerRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/songs", songRoutes);
router.use("/likes", likeRoutes);
router.use("/playlists", playlistRoutes);
router.use("/history", historyRoutes);
router.use("/moods", moodRoutes);
router.use("/banners", bannerRoutes);

export default router;