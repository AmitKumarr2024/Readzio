import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  sendDailyPostEmail,
  getDailyPostEmailReport,
  deleteAllNotifications,
} from "../Controllers/postEmailController.js";

const router = express.Router();

// Send daily post email to all verified users
router.post("/daily-post", protectedRoute, sendDailyPostEmail);

// Fetch daily post email report
router.get("/daily-post-report", protectedRoute, getDailyPostEmailReport);

// Delete all notifications
router.delete("/notifications", protectedRoute, deleteAllNotifications);

// ✅ Manual test route to trigger email now
router.get("/test", async (req, res) => {
  try {
    console.log("[ManualTrigger] Calling sendDailyPostEmail");
    await sendDailyPostEmail(req, res, () => {});
  } catch (err) {
    console.error("[ManualTrigger] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
