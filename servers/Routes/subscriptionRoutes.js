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
  checkEligibilityForSubscription,
  activateSubscriptionPlan,
} from "../Controllers/subscriptionController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes for subscription plans
// POST /plans - Creates a subscription plan
router.post("/plans", protectedRoute, createSubscriptionPlan);
// PATCH /plans/:planId - Updates a subscription plan
router.patch("/plans/:planId", protectedRoute, updateSubscriptionPlan);
// DELETE /plans/:planId - Deletes a subscription plan
router.delete("/plans/:planId", protectedRoute, deleteSubscriptionPlan);

// Subscription management
// POST /subscribe - Subscribes to a plan
router.post("/subscribe", protectedRoute, subscribeToPlan);
// PATCH /subscriptions/:subscriptionId/cancel - Cancels a subscription
router.patch("/subscriptions/:subscriptionId/cancel", protectedRoute, cancelSubscription);
// PATCH /:subscriptionId/refund - Refunds a subscription
router.patch("/:subscriptionId/refund", protectedRoute, refundSubscription);
// GET /author/:authorId/subscriptions - Fetches subscription history by author
router.get("/author/:authorId/subscriptions", protectedRoute, getSubscriptionHistoryByAuthor);
// GET /check-eligibility - Checks eligibility for subscription
router.get("/check-eligibility", protectedRoute, checkEligibilityForSubscription);
// GET /my-subscriptions - Fetches plans the user is subscribed to
router.get("/my-subscriptions", protectedRoute, getMySubscribedPlans);
// POST /plans/:planId/activate - Activates a subscription plan
router.post("/plans/:planId/activate", protectedRoute, activateSubscriptionPlan);

// Analytics and reminders
// GET /plans/:planId/analytics - Fetches subscription analytics
router.get("/plans/:planId/analytics", protectedRoute, getSubscriptionAnalytics);
// POST /reminders - Sends renewal reminders
router.post("/reminders", protectedRoute, sendRenewalReminders);
// GET /my-plans - Fetches all plans created by the user
router.get("/my-plans", protectedRoute, getAllMySubscriptionPlans);
// GET /plans/author/:authorId - Fetches plans by author
router.get("/plans/author/:authorId", protectedRoute, getSubscriptionPlansByAuthor);
// POST /unsubscribe/author - Unsubscribes from an author
router.post("/unsubscribe/author", protectedRoute, unsubscribeByAuthor);
// POST /status - Gets subscription status by author
router.post("/status", protectedRoute, getSubscriptionStatusByAuthor);

export default router;