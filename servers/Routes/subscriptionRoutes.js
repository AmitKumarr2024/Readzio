import express from "express";
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  subscribeToPlan,
  cancelSubscription,
  refundSubscription,
  getSubscriptionAnalytics,
  sendRenewalReminders,
  getAllMySubscriptionPlans,
  getSubscriptionPlansByAuthor,
  unsubscribeByAuthor,
  getSubscriptionStatusByAuthor,
  getSubscriptionHistoryByAuthor,
  getMySubscribedPlans,
  checkEligibilityForSubscription, // 👈 new controller
} from "../Controllers/subscriptionController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Subscription Plan Routes
router.post("/plans", protectedRoute, createSubscriptionPlan);
router.patch("/plans/:planId", protectedRoute, updateSubscriptionPlan);
router.delete("/plans/:planId", protectedRoute, deleteSubscriptionPlan);

// Subscription Management
router.post("/subscribe", protectedRoute, subscribeToPlan);
router.patch(
  "/subscriptions/:subscriptionId/cancel",
  protectedRoute,
  cancelSubscription
);
router.patch("/:subscriptionId/refund", protectedRoute, refundSubscription);
router.get(
  "/author/:authorId/subscriptions",
  protectedRoute,
  getSubscriptionHistoryByAuthor
);

// Analytics and Reminders
router.get("/plans/:planId/analytics", protectedRoute, getSubscriptionAnalytics);
router.post("/reminders", protectedRoute, sendRenewalReminders);
router.get("/my-plans", protectedRoute, getAllMySubscriptionPlans);
router.get("/plans/author/:authorId", protectedRoute, getSubscriptionPlansByAuthor);
router.post("/unsubscribe/author", protectedRoute, unsubscribeByAuthor);
router.post("/status", protectedRoute, getSubscriptionStatusByAuthor);
// Add this below other routes
router.get("/check-eligibility", protectedRoute, checkEligibilityForSubscription);

// ✅ NEW: Get plans user has subscribed to
router.get("/my-subscriptions", protectedRoute, getMySubscribedPlans);

export default router;
