import express from "express";
import {
  createSubscriptionPlan,
  getSubscriptionPlan,
  subscribeToPlan,
  checkPostAccess,
  getMySubscriptions,
  getSubscribers,
  deleteSubscription,
  deleteSubscriptionPlan,
} from "../Controllers/subscriptionPlanController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Plan management
router.post("/author/create", protectedRoute, createSubscriptionPlan);
router.get("/author/:authorId/plan", protectedRoute, getSubscriptionPlan);
router.delete("/author/:authorId/plan", protectedRoute, deleteSubscriptionPlan);

// Subscriber management
router.get("/author/:authorId/subscribers", protectedRoute, getSubscribers);
router.delete("/author/:authorId/subscriber/:subscriberId", protectedRoute, deleteSubscription);

// User subscriptions and access
router.post("/subscribe/:authorId", protectedRoute, subscribeToPlan);
router.get("/check-access/:authorId/post/:postId", protectedRoute, checkPostAccess);
router.get("/my-subscriptions", protectedRoute, getMySubscriptions);

export default router;