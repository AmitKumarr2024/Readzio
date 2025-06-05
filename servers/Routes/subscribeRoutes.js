import express from "express";
import {
  fetchFollowers,
  fetchFollowing,
  followUser,
  unfollowUser,
  subscribeToAuthor,
  unsubscribeFromAuthor,
  getFollowStatus,
  getSubscriptionStatus,
} from "../Controllers/subscribeController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// ✅ Require login for all routes
router.use(protectedRoute);

// 🔁 Follow / Unfollow
router.post("/follow/:targetUserId", followUser);
router.post("/unfollow/:targetUserId", unfollowUser);

// 📡 Follow status (NEW)
router.get("/follow/status/:targetUserId", getFollowStatus);

// 💰 Subscribe / Unsubscribe to author
router.post("/author/subscribe/:authorId", subscribeToAuthor);
router.post("/author/unsubscribe/:authorId", unsubscribeFromAuthor);

// 📡 Subscription status (NEW)
router.get("/status/:authorId", getSubscriptionStatus);

// 📥 Followers / Following list
router.get("/followers", fetchFollowers);
router.get("/following", fetchFollowing);



export default router;
