// routes/dailyMailRoutes.js
import express from "express";
import {
  sendDailyPostEmail,
  getAllEmailStatuses,
  checkEmailStatus,
  retryFailedEmails,
  sendDirectEmail,
} from "../Controllers/dailyPostEmailController.js";

const router = express.Router();

// 1️⃣ Send daily digest emails (trigger manually or via cron)
router.post("/send-daily-email", sendDailyPostEmail);

// 2️⃣ Get all email statuses (with pagination and optional status filter)
router.get("/email-statuses", getAllEmailStatuses);

// 3️⃣ Check single email status
router.get("/email-status", checkEmailStatus);

// 4️⃣ Retry failed emails
router.post("/retry-failed", retryFailedEmails);

// 5️⃣ Send direct/manual email to a user
router.post("/send-direct-email", sendDirectEmail);

export default router;
