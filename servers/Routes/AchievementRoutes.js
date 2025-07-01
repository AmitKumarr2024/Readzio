import express from "express";
import { calculateUserAchievements, getUserAchievements } from "../Controllers/achievementController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Achievement Routes
router.get("/achievements", protectedRoute, getUserAchievements);
router.post("/achievements/calculate", protectedRoute, calculateUserAchievements);

export default router;