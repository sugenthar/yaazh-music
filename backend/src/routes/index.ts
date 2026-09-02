import { Router } from "express";
import authRoutes from "./authRoutes";
import songRoutes from "./songRoutes";
import likeRoutes from "./likeRoutes";
import playlistRoutes from "./playlistRoutes";
import historyRoutes from "./historyRoutes";
import moodRoutes from "./moodRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/songs", songRoutes);
router.use("/likes", likeRoutes);
router.use("/playlists", playlistRoutes);
router.use("/history", historyRoutes);
router.use("/moods", moodRoutes);

export default router;