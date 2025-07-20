import express from "express";
import { calculateUserAchievements, getUserAchievements } from "../Controllers/achievementController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes for user achievements
// GET /achievements - Fetches user's achievements
router.get("/achievements", protectedRoute, getUserAchievements);

// POST /achievements/calculate - Calculates and updates user achievements
router.post("/achievements/calculate", protectedRoute, calculateUserAchievements);

export default router;